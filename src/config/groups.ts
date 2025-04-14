export const privateGroupId = process.env.PRIVATE_GROUP_ID;

if (!privateGroupId) {
  throw new Error("PRIVATE_GROUP_ID должен быть указан в .env файле");
}
