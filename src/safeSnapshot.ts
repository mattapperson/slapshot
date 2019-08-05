export function safeSnapshot(obj: any, toSnapshot: boolean = true) {
  if (typeof obj !== "object") {
    return obj;
  }
  if (obj === null) {
    return null;
  }
  return Object.keys(obj).reduce(
    (safeObject, key) => {
      if (
        !toSnapshot &&
        safeObject[key] === "[UNMOCKED-UNSNAPSHOTTED-FUNCTION]"
      ) {
        safeObject[key] = () => {
          throw new Error(
            `${key} can not be called directly. It must first be mocked with or without using memorize.`
          );
        };
      }
      if (toSnapshot && typeof safeObject[key] === "function") {
        safeObject[key] = "[UNMOCKED-UNSNAPSHOTTED-FUNCTION]";
      }
      if (typeof safeObject[key] === "object") {
        safeObject[key] = safeSnapshot(safeObject[key], toSnapshot);
      }
      return safeObject;
    },
    { ...obj }
  );
}
