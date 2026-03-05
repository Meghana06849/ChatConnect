export const getDreamRoomId = (userId: string, partnerId: string): string => {
  const [a, b] = [userId, partnerId].sort();
  return `dreamroom_${a}_${b}`;
};
