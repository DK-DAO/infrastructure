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
    staking: stringToBytes32('StakingOperator'),
  },
};

export const zeroAddress = '0x0000000000000000000000000000000000000000';
