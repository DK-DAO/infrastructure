export class BytesBuffer {
  private tmpBuf: Buffer[] = [];

  public static newInstance(): BytesBuffer {
    return new BytesBuffer();
  }

  public writeAddress(address: string): BytesBuffer {
    this.tmpBuf.push(Buffer.from(address.replace(/^0x/gi, ''), 'hex'));
    return this;
  }

  public writeUint256(uint256: string | Buffer): BytesBuffer {
    if (typeof uint256 === 'string') {
      this.tmpBuf.push(Buffer.from(uint256.replace(/^0x/gi, '').padStart(64, '0'), 'hex'));
    } else {
      this.tmpBuf.push(uint256);
    }

    return this;
  }

  public writeBytes(hexStringOrBinary: string | Buffer): BytesBuffer {
    if (typeof hexStringOrBinary === 'string') {
      let tmp = hexStringOrBinary.replace(/^0x/gi, '');
      tmp = tmp.length % 2 === 0 ? tmp : `0${tmp}`;
      this.tmpBuf.push(Buffer.from(tmp, 'hex'));
    } else {
      this.tmpBuf.push(hexStringOrBinary);
    }
    return this;
  }

  public invoke(): Buffer {
    return Buffer.concat(this.tmpBuf);
  }
}

export default BytesBuffer;
