import { stringToBytes32 } from './functions';

export const registryRecords = {
  domain: {
    infrastructure: stringToBytes32('DKDAO Infrastructure'),
    dkdao: stringToBytes32('DKDAO'),
    duelistKing: stringToBytes32('Duelist King'),
  },
  name: {
    dao: stringToBytes32('DAO'),
    daoToken: stringToBytes32('DAO Token'),
    pool: stringToBytes32('Pool'),
    oracle: stringToBytes32('Oracle'),
    rng: stringToBytes32('RNG'),
    nft: stringToBytes32('NFT'),
    factory: stringToBytes32('Factory'),
  },
};


export const zeroAddress = '0x0000000000000000000000000000000000000000';