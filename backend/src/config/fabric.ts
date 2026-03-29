// =============================================================================
// 基于区块链的医用耗材供应链管理系统 - Fabric连接配置
// =============================================================================
// 功能: 提供Hyperledger Fabric网络的连接配置
// =============================================================================

import path from 'path';

// 连接配置文件 - 用于Fabric SDK连接到区块链网络
// 这个配置文件定义了各组织的节点信息
export const connectionProfile = {
  name: 'medical-supply-chain-network',
  version: '1.0.0',

  // 客户端配置
  client: {
    organization: 'Producer',
    connection: {
      timeout: {
        peer: {
          endorser: '300',
        },
        orderer: '300',
      },
    },
  },

  // 组织配置
  organizations: {
    Producer: {
      mspid: 'ProducerMSP',
      peers: ['peer0.producer.supplychain.com'],
      certificateAuthorities: ['ca.producer.supplychain.com'],
    },
    Distributor: {
      mspid: 'DistributorMSP',
      peers: ['peer0.distributor.supplychain.com'],
      certificateAuthorities: ['ca.distributor.supplychain.com'],
    },
    Hospital: {
      mspid: 'HospitalMSP',
      peers: ['peer0.hospital.supplychain.com'],
      certificateAuthorities: ['ca.hospital.supplychain.com'],
    },
    Regulator: {
      mspid: 'RegulatorMSP',
      peers: ['peer0.regulator.supplychain.com'],
      certificateAuthorities: ['ca.regulator.supplychain.com'],
    },
  },

  // 排序服务配置
  orderers: {
    'orderer1.supplychain.com': {
      url: 'grpcs://localhost:7050',
      grpcOptions: {
        'ssl-target-name-override': 'orderer1.supplychain.com',
      },
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/ordererOrganizations/supplychain.com/orderers/orderer1.supplychain.com/tls/ca.crt'),
      },
    },
    'orderer2.supplychain.com': {
      url: 'grpcs://localhost:8050',
      grpcOptions: {
        'ssl-target-name-override': 'orderer2.supplychain.com',
      },
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/ordererOrganizations/supplychain.com/orderers/orderer2.supplychain.com/tls/ca.crt'),
      },
    },
    'orderer3.supplychain.com': {
      url: 'grpcs://localhost:9050',
      grpcOptions: {
        'ssl-target-name-override': 'orderer3.supplychain.com',
      },
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/ordererOrganizations/supplychain.com/orderers/orderer3.supplychain.com/tls/ca.crt'),
      },
    },
  },

  // Peer节点配置
  peers: {
    'peer0.producer.supplychain.com': {
      url: 'grpcs://localhost:7051',
      grpcOptions: {
        'ssl-target-name-override': 'peer0.producer.supplychain.com',
        'request-timeout': 120001,
      },
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/producer.supplychain.com/peers/peer0.producer.supplychain.com/tls/ca.crt'),
      },
    },
    'peer0.distributor.supplychain.com': {
      url: 'grpcs://localhost:7251',
      grpcOptions: {
        'ssl-target-name-override': 'peer0.distributor.supplychain.com',
        'request-timeout': 120001,
      },
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/distributor.supplychain.com/peers/peer0.distributor.supplychain.com/tls/ca.crt'),
      },
    },
    'peer0.hospital.supplychain.com': {
      url: 'grpcs://localhost:7451',
      grpcOptions: {
        'ssl-target-name-override': 'peer0.hospital.supplychain.com',
        'request-timeout': 120001,
      },
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/hospital.supplychain.com/peers/peer0.hospital.supplychain.com/tls/ca.crt'),
      },
    },
    'peer0.regulator.supplychain.com': {
      url: 'grpcs://localhost:7651',
      grpcOptions: {
        'ssl-target-name-override': 'peer0.regulator.supplychain.com',
        'request-timeout': 120001,
      },
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/regulator.supplychain.com/peers/peer0.regulator.supplychain.com/tls/ca.crt'),
      },
    },
  },

  // 证书颁发机构配置
  certificateAuthorities: {
    'ca.producer.supplychain.com': {
      url: 'https://localhost:7054',
      caName: 'ca.producer.supplychain.com',
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/producer.supplychain.com/ca/ca.producer.supplychain.com-cert.pem'),
      },
      httpOptions: {
        verify: false,
      },
    },
    'ca.distributor.supplychain.com': {
      url: 'https://localhost:7254',
      caName: 'ca.distributor.supplychain.com',
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/distributor.supplychain.com/ca/ca.distributor.supplychain.com-cert.pem'),
      },
      httpOptions: {
        verify: false,
      },
    },
    'ca.hospital.supplychain.com': {
      url: 'https://localhost:7454',
      caName: 'ca.hospital.supplychain.com',
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/hospital.supplychain.com/ca/ca.hospital.supplychain.com-cert.pem'),
      },
      httpOptions: {
        verify: false,
      },
    },
    'ca.regulator.supplychain.com': {
      url: 'https://localhost:7654',
      caName: 'ca.regulator.supplychain.com',
      tlsCACerts: {
        path: path.join(__dirname, '../../blockchain/crypto-config/peerOrganizations/regulator.supplychain.com/ca/ca.regulator.supplychain.com-cert.pem'),
      },
      httpOptions: {
        verify: false,
      },
    },
  },
};

// 各组织的连接配置
export const orgConnectionProfiles = {
  producer: {
    ...connectionProfile,
    client: {
      ...connectionProfile.client,
      organization: 'Producer',
    },
  },
  distributor: {
    ...connectionProfile,
    client: {
      ...connectionProfile.client,
      organization: 'Distributor',
    },
  },
  hospital: {
    ...connectionProfile,
    client: {
      ...connectionProfile.client,
      organization: 'Hospital',
    },
  },
  regulator: {
    ...connectionProfile,
    client: {
      ...connectionProfile.client,
      organization: 'Regulator',
    },
  },
};

export default connectionProfile;
