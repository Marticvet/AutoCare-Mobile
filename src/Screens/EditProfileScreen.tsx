import React from "react";
import SettingsScreen from "./v2/SettingsScreen";

/** @deprecated Profile preferences now live in the consolidated settings screen. */
export function EditProfileScreen(props: any) {
    const Component = SettingsScreen as React.ComponentType<any>;
    return <Component {...props} />;
}
