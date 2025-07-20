import { useCallback, useEffect, useState } from "react";
import { useSystem } from "../../powersync/PowerSync";
import { Profile } from "../../powersync/AppSchema";

export const useProfile = (userId: string) => {
    const { db } = useSystem();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | boolean>(false);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const result = await db
                .selectFrom("profiles")
                .selectAll()
                .where("id", "=", userId)
                .executeTakeFirst(); // single row

            setProfile(result ?? null);
            setError(false);
        } catch (err: any) {
            setError(err);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    }, [db, userId]);

    useEffect(() => {
        if (userId) {
            fetchProfile();
        }
    }, [fetchProfile]);

    return { profile, loading, error, refetch: fetchProfile };
};

export const useUpdateProfile = () => {
    const { db } = useSystem();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const updateProfile = useCallback(
        async (userId: string, profile: Partial<Profile>) => {
            setLoading(true);
            setError(null);

            try {
                const result = await db
                    .updateTable("profiles")
                    .set(profile)
                    .where("id", "=", userId)
                    .execute();

                console.log("Profile updated locally!");
            } catch (err) {
                console.error("Local profile update failed:", err);
                setError(err as Error);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [db]
    );

    return { updateProfile, loading, error };
};
