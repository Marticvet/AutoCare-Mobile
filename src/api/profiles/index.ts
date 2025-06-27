import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Profile } from "../../../types/profile";
import { useSystem } from "../../powersync/PowerSync";

let queryKey: string = "profiles";

export const useProfile = (id: string) => {
    const { supabaseConnector } = useSystem();

    return useQuery({
        queryKey: [queryKey, id],
        queryFn: async () => {
            const { data, error } = await supabaseConnector
                .from(queryKey)
                .select("*")
                .eq("id", id)
                .single();

            if (error) {
                throw new Error(error.message);
            }
            return data;
        },
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    const { supabaseConnector } = useSystem();

    return useMutation({
        mutationFn: async ({
            profile,
            userId,
        }: {
            profile: Profile;
            userId: string;
        }) => {
            const { error, data: updateProfile } = await supabaseConnector
                .from(queryKey) // Use correct table name
                .update(profile) // Only update the fields inside `profile`
                .eq("id", userId) // Update only the selected profile
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            return updateProfile;
        },
        onSuccess: async (_, { userId }) => {
            console.log("Profile updated successfully!");

            //  Refresh the updated profile
            // @ts-ignore
            await queryClient.invalidateQueries(["profiles"]); // efresh the updated profile
            // @ts-ignore
            await queryClient.invalidateQueries(["profiles", userId]); // Refresh specific profile
        },
    });
};
