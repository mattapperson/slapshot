export const shouldUpdateSnapshot = () => {
  return ["--updateSnapshot", "-u"].some(d =>
    process.argv.slice(2).includes(d)
  );
};

export const runInOnlineMode = () => {
  return (
    process.env.SLAPSHOT_ONLINE !== undefined &&
    process.env.SLAPSHOT_ONLINE !== "false"
  );
};
