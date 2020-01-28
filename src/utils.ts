export const runInOnlineMode = () => {
    return (
        process.env.SLAPSHOT_ONLINE !== undefined &&
        process.env.SLAPSHOT_ONLINE !== "false"
    );
};
