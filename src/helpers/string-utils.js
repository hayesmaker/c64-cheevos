export const camelize = (s) => {
  const sa = s
    .replace(/[^\w\d\s]/g, '')
    .toLowerCase()
    .split(/\s+/);

  return sa
    .filter(v => !!v)
    .map((w, i) => (i > 0 ? w[0].toUpperCase() + w.substr(1) : w))
    .join('');
};

export const pad = (n) => {
  if (parseInt(n) === 0) {
    return '00';
  }
  if (parseInt(n) < 10) {
    return '0' + n;
  }
  return n;
}

const cpuReadNS = (reader, mem) => reader?.cpuReadNS?.(mem) ?? 0;

export const screenRamLetter = (mem, reader, offset = 0) => {
  const chars = "@abcdefghijklmnopqrstuvwxyz";
  const letter = parseInt(cpuReadNS(reader, mem)) - offset;
  return chars.charAt(letter);
}

// 48 dec = 30 hex
export const screenRamDigit = (mem, reader, offset = 48) => {
  const digit = cpuReadNS(reader, mem) - offset;
  // console.log('mem', mem, 'digit', digit);
  return digit.toString();
}

export const convertMemToScoreDigits = (mem, reader) => {
  return pad(cpuReadNS(reader, mem).toString(16));
}
