import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystem } from "../../powersync/PowerSync";
import { Profile } from "../../powersync/AppSchema";

const queryKey = "profiles";

export const useProfile = (id: string) => {
    const { db } = useSystem(); // PowerSync Kysely DB

    return useQuery({
        queryKey: [queryKey, id],
        queryFn: async () => {
            const result = await db
                .selectFrom("profiles")
                .selectAll()
                .where("id", "=", id)
                .execute();

            if (result.length === 0) {
                throw new Error("Profile not found");
            }

            return result[0];
        },
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    const { db } = useSystem();

    return useMutation({
        mutationFn: async ({
            profile,
            userId,
        }: {
            profile: Profile;
            userId: string;
        }) => {
            await db
                .updateTable("profiles")
                .set(profile)
                .where("id", "=", userId)
                .execute();

            return profile;
        },
        onSuccess: async (_, { userId }) => {
            console.log("Profile updated successfully");

            // @ts-ignore
            await queryClient.invalidateQueries(["profiles"]);
            // @ts-ignore
            await queryClient.invalidateQueries(["profiles", userId]);
        },
        onError: (error) => {
            console.error("Failed to update profile:", error);
        },
    });
};
