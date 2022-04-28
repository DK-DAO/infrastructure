export function stringToBytes32(v: string) {
  const buf = Buffer.alloc(32);
  buf.write(v);
  return `0x${buf.toString('hex')}`;
}

export const registryRecords = {
  domain: {
    infrastructure: stringToBytes32('Infrastructure'),
    dkdao: stringToBytes32('DKDAO'),
    duelistKing: stringToBytes32('Duelist King'),
  },
  name: {
    merchant: stringToBytes32('Merchant'),
    salesAgent: stringToBytes32('Sales Agent'),
    migrator: stringToBytes32('Migrator'),
    dao: stringToBytes32('DAO'),
    daoToken: stringToBytes32('DAO Token'),
    pool: stringToBytes32('Pool'),
    oracle: stringToBytes32('Oracle'),
    rng: stringToBytes32('RNG'),
    operator: stringToBytes32('Operator'),
    nft: stringToBytes32('NFT'),
    card: stringToBytes32('NFT Card'),
    item: stringToBytes32('NFT Item'),
    distributor: stringToBytes32('Distributor'),
    factory: stringToBytes32('Factory'),
    press: stringToBytes32('Press'),
    stakingOperator: stringToBytes32('Staking Operator'),
  },
};

export const zeroAddress = '0x0000000000000000000000000000000000000000';
export const uint = '1000000000000000000';
export const emptyBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000';
export const maxUint256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
