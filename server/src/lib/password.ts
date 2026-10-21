import bcrypt from 'bcryptjs';

const ROUNDS = 12;
let dummyHash: Promise<string> | null = null;

function paddingHash(): Promise<string> {
  dummyHash ??= bcrypt.hash('pesowise-timing-pad', ROUNDS);
  return dummyHash;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string | null): Promise<boolean> {
  const hash = passwordHash ?? (await paddingHash());
  const matches = await bcrypt.compare(password, hash);
  return Boolean(passwordHash) && matches;
}
