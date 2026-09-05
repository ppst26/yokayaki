export function generatePromptPayQR(targetId: string, amount: number): string {
  let target = targetId.replace(/[^0-9]/g, '');
  if (target.length === 10 && target.startsWith('0')) {
    target = '0066' + target.substring(1);
  }
  const targetTag = target.length === 13 ? '02' : '01';
  const subField04 = `0016A000000677010111${targetTag}${target.length.toString().padStart(2, '0')}${target}`;
  const field29 = `29${subField04.length.toString().padStart(2, '0')}${subField04}`;
  const amtStr = amount.toFixed(2);
  const field54 = `54${amtStr.length.toString().padStart(2, '0')}${amtStr}`;

  const raw = `000201010212${field29}5303764${field54}5802TH5908YOKAYAKI6304`;

  function crc16Hex(str: string): string {
    let crc = 0xffff;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
        else crc = (crc << 1) & 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  return raw + crc16Hex(raw);
}
