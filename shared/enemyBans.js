// Disabled enemies must be excluded before wave counts are computed and at direct spawn.
export const BANNED_ENEMY_KEYS = Object.freeze(['enemy_1234_dsubrl']); // 深溟巢涌者
export const isEnemyBanned = (key) => BANNED_ENEMY_KEYS.includes(key);
