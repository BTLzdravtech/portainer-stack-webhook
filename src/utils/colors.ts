// ANSI color is emitted only when attached to a TTY (or forced), and never
// when NO_COLOR is set — so piped/aggregated logs (e.g. `docker logs`) stay
// plain text. See https://no-color.org.
const enabled =
  !process.env.NO_COLOR &&
  (Boolean(process.env.FORCE_COLOR) || Boolean(process.stdout.isTTY));

const wrap = (code: number) => (str: string) =>
  enabled ? `\x1b[${code}m${str}\x1b[0m` : str;

export const bold = wrap(1);
export const dim = wrap(2);
export const red = wrap(31);
export const green = wrap(32);
export const yellow = wrap(33);
export const blue = wrap(34);
export const violet = wrap(35);
export const cyan = wrap(36);
