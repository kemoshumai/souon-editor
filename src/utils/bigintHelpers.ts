/**
 * BigInt変換のためのユーティリティ関数
 */

/**
 * 数値を安全にBigIntに変換する
 * @param value 変換する数値
 * @returns BigInt値
 * @throws Error 値が有限でない場合や無効な場合
 */
export function safeBigInt(value: number): bigint {
  if (!Number.isFinite(value)) {
    throw new Error(`Cannot convert ${value} to BigInt: value must be finite`);
  }
  
  const intValue = Math.floor(value);
  return BigInt(intValue);
}

/**
 * 秒数をナノ秒のBigIntに変換する
 * @param seconds 秒数
 * @returns ナノ秒のBigInt値
 */
export function secondsToNanosecondsBigInt(seconds: number): bigint {
  if (!Number.isFinite(seconds)) {
    throw new Error(`Cannot convert ${seconds} seconds to nanoseconds: value must be finite`);
  }
  
  const nanoseconds = seconds * 1_000_000_000;
  return safeBigInt(nanoseconds);
}

/**
 * 値が安全にBigIntに変換できるかチェックする
 * @param value チェックする値
 * @returns 安全に変換できるかどうか
 */
export function canConvertToBigInt(value: number): boolean {
  return Number.isFinite(value) && !Number.isNaN(value);
}
