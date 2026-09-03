const fs = require("fs");
const path = require("path");
const {
    createRunOncePlugin,
    withDangerousMod,
} = require("expo/config-plugins");

const packageMetadata = {
    name: "autocare-with-quick-sqlite-use-frameworks",
    version: "1.0.0",
};

const preInstallHook = `
pre_install do |installer|
  installer.pod_targets.each do |pod|
    if pod.name.eql?('react-native-quick-sqlite')
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end
`;

function addStaticLibraryHook(podfilePath) {
    const podfile = fs.readFileSync(podfilePath, "utf8");

    if (podfile.includes("pod.name.eql?('react-native-quick-sqlite')")) {
        return;
    }

    const updatedPodfile = podfile.replace(
        /target\s+'[^']+'\s+do/,
        (target) => `${target}\n${preInstallHook}`,
    );

    fs.writeFileSync(podfilePath, updatedPodfile, "utf8");
}

function withQuickSQLiteUseFrameworks(config, options = {}) {
    if (!options.staticLibrary) {
        return config;
    }

    return withDangerousMod(config, ["ios", (modifiedConfig) => {
        const podfilePath = path.join(
            modifiedConfig.modRequest.platformProjectRoot,
            "Podfile",
        );

        addStaticLibraryHook(podfilePath);
        return modifiedConfig;
    }]);
}

module.exports = createRunOncePlugin(
    withQuickSQLiteUseFrameworks,
    packageMetadata.name,
    packageMetadata.version,
);
