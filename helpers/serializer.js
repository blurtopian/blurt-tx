const PublicKey = require('./PublicKey')
const Asset = require('./asset')
const HexBuffer = require('./HexBuffer')
const config = require('../config')

const VoidSerializer = () => {
  throw new Error('Void can not be serialized')
}

const StringSerializer = (buffer, data) => {
  buffer.writeVString(data)
}

const Int8Serializer = (buffer, data) => {
  buffer.writeInt8(data)
}

const Int16Serializer = (buffer, data) => {
  buffer.writeInt16(data)
}

const Int32Serializer = (buffer, data) => {
  buffer.writeInt32(data)
}

const Int64Serializer = (buffer, data) => {
  buffer.writeInt64(data)
}

const UInt8Serializer = (buffer, data) => {
  buffer.writeUint8(data)
}

const UInt16Serializer = (buffer, data) => {
  buffer.writeUint16(data)
}

const UInt32Serializer = (buffer, data) => {
  buffer.writeUint32(data)
}

const UInt64Serializer = (buffer, data) => {
  buffer.writeUint64(data)
}

const BooleanSerializer = (buffer, data) => {
  buffer.writeByte(data ? 1 : 0)
}

const StaticVariantSerializer = (itemSerializers) => {
  return (buffer, data) => {
    const [id, item] = data
    buffer.writeVarint32(id)
    itemSerializers[id](buffer, item)
  }
}

/**
 * Serialize asset.
 * @note This looses precision for amounts larger than 2^53-1/10^precision.
 *       Should not be a problem in real-word usage.
 */
const AssetSerializer = (buffer, data) => {
  const asset = Asset.from(data)
  const precision = asset.getPrecision()
  buffer.writeInt64(Math.round(asset.amount * Math.pow(10, precision)))
  buffer.writeUint8(precision)
  for (let i = 0; i < 7; i++) {
    buffer.writeUint8(asset.symbol.charCodeAt(i) || 0)
  }
}

const DateSerializer = (buffer, data) => {
  buffer.writeUint32(Math.floor(new Date(data + 'Z').getTime() / 1000))
}

const PublicKeySerializer = (buffer, data) => {
  if (
    data === null ||
    (typeof data === 'string' &&
      data.slice(-39) === '1111111111111111111111111111111114T1Anm')
  ) {
    buffer.append(Buffer.alloc(33, 0))
  } else {
    buffer.append(PublicKey.from(data).key)
  }
}

const BinarySerializer = (size = null) => {
  return (buffer, data) => {
    data = HexBuffer.from(data)
    const len = data.buffer.length
    if (size) {
      if (len !== size) {
        throw new Error(
          `Unable to serialize binary. Expected ${size} bytes, got ${len}`
        )
      }
    } else {
      buffer.writeVarint32(len)
    }
    buffer.append(data.buffer)
  }
}

const VariableBinarySerializer = BinarySerializer()

const FlatMapSerializer = (keySerializer, valueSerializer) => {
  return (buffer, data) => {
    buffer.writeVarint32(data.length)
    for (const [key, value] of data) {
      keySerializer(buffer, key)
      valueSerializer(buffer, value)
    }
  }
}

const ArraySerializer = (itemSerializer) => {
  return (buffer, data) => {
    buffer.writeVarint32(data.length)
    for (const item of data) {
      itemSerializer(buffer, item)
    }
  }
}

const ObjectSerializer = (keySerializers) => {
  return (buffer, data) => {
    for (const [key, serializer] of keySerializers) {
      try {
        serializer(buffer, data[key])
      } catch (error) {
        error.message = `${key}: ${error.message}`
        throw error
      }
    }
  }
}

const OptionalSerializer = (valueSerializer) => {
  return (buffer, data) => {
    if (data !== undefined) {
      buffer.writeByte(1)
      valueSerializer(buffer, data)
    } else {
      buffer.writeByte(0)
    }
  }
}

const AuthoritySerializer = ObjectSerializer([
  ['weight_threshold', UInt32Serializer],
  ['account_auths', FlatMapSerializer(StringSerializer, UInt16Serializer)],
  ['key_auths', FlatMapSerializer(PublicKeySerializer, UInt16Serializer)]
])

const BeneficiarySerializer = ObjectSerializer([
  ['account', StringSerializer],
  ['weight', UInt16Serializer]
])

const PriceSerializer = ObjectSerializer([
  ['base', AssetSerializer],
  ['quote', AssetSerializer]
])

const SignedBlockHeaderSerializer = ObjectSerializer([
  ['previous', BinarySerializer(20)],
  ['timestamp', DateSerializer],
  ['witness', StringSerializer],
  ['transaction_merkle_root', BinarySerializer(20)],
  ['extensions', ArraySerializer(VoidSerializer)],
  ['witness_signature', BinarySerializer(65)]
])

const ChainPropertiesSerializer = ObjectSerializer([
  ['account_creation_fee', AssetSerializer],
  ['maximum_block_size', UInt32Serializer],
  ['hbd_interest_rate', UInt16Serializer]
])

const OperationDataSerializer = (operationId, definitions) => {
  const objectSerializer = ObjectSerializer(definitions)
  return (buffer, data) => {
    buffer.writeVarint32(operationId)
    objectSerializer(buffer, data)
  }
}

const OperationSerializers = {}

OperationSerializers.account_create = OperationDataSerializer(9, [
  ['fee', AssetSerializer],
  ['creator', StringSerializer],
  ['new_account_name', StringSerializer],
  ['owner', AuthoritySerializer],
  ['active', AuthoritySerializer],
  ['posting', AuthoritySerializer],
  ['memo_key', PublicKeySerializer],
  ['json_metadata', StringSerializer]
])

OperationSerializers.account_update = OperationDataSerializer(6, [
  ['account', StringSerializer],
  ['owner', OptionalSerializer(AuthoritySerializer)],
  ['active', OptionalSerializer(AuthoritySerializer)],
  ['posting', OptionalSerializer(AuthoritySerializer)],
  ['memo_key', PublicKeySerializer],
  ['json_metadata', StringSerializer]
])

OperationSerializers.account_witness_proxy = OperationDataSerializer(9, [
  ['account', StringSerializer],
  ['proxy', StringSerializer]
])

OperationSerializers.account_witness_vote = OperationDataSerializer(8, [
  ['account', StringSerializer],
  ['witness', StringSerializer],
  ['approve', BooleanSerializer]
])

OperationSerializers.cancel_transfer_from_savings = OperationDataSerializer(
  26,
  [
    ['from', StringSerializer],
    ['request_id', UInt32Serializer]
  ]
)

OperationSerializers.change_recovery_account = OperationDataSerializer(19, [
  ['account_to_recover', StringSerializer],
  ['new_recovery_account', StringSerializer],
  ['extensions', ArraySerializer(VoidSerializer)]
])

OperationSerializers.claim_account = OperationDataSerializer(15, [
  ['creator', StringSerializer],
  ['fee', AssetSerializer],
  ['extensions', ArraySerializer(VoidSerializer)]
])

OperationSerializers.claim_reward_balance = OperationDataSerializer(31, [
  ['account', StringSerializer],
  ['reward_blurt', AssetSerializer],
  ['reward_vests', AssetSerializer]
])

OperationSerializers.comment = OperationDataSerializer(1, [
  ['parent_author', StringSerializer],
  ['parent_permlink', StringSerializer],
  ['author', StringSerializer],
  ['permlink', StringSerializer],
  ['title', StringSerializer],
  ['body', StringSerializer],
  ['json_metadata', StringSerializer]
])

OperationSerializers.comment_options = OperationDataSerializer(13, [
  ['author', StringSerializer],
  ['permlink', StringSerializer],
  ['max_accepted_payout', AssetSerializer],
  ['percent_hbd', UInt16Serializer],
  ['allow_votes', BooleanSerializer],
  ['allow_curation_rewards', BooleanSerializer],
  [
    'extensions',
    ArraySerializer(
      StaticVariantSerializer([
        ObjectSerializer([
          ['beneficiaries', ArraySerializer(BeneficiarySerializer)]
        ])
      ])
    )
  ]
])

OperationSerializers.create_claimed_account = OperationDataSerializer(16, [
  ['creator', StringSerializer],
  ['new_account_name', StringSerializer],
  ['owner', AuthoritySerializer],
  ['active', AuthoritySerializer],
  ['posting', AuthoritySerializer],
  ['memo_key', PublicKeySerializer],
  ['json_metadata', StringSerializer],
  ['extensions', ArraySerializer(VoidSerializer)]
])

OperationSerializers.custom = OperationDataSerializer(10, [
  ['required_auths', ArraySerializer(StringSerializer)],
  ['id', UInt16Serializer],
  ['data', VariableBinarySerializer]
])

OperationSerializers.custom_binary = OperationDataSerializer(27, [
  ['required_owner_auths', ArraySerializer(StringSerializer)],
  ['required_active_auths', ArraySerializer(StringSerializer)],
  ['required_posting_auths', ArraySerializer(StringSerializer)],
  ['required_auths', ArraySerializer(AuthoritySerializer)],
  ['id', StringSerializer],
  ['data', VariableBinarySerializer]
])

OperationSerializers.custom_json = OperationDataSerializer(12, [
  ['required_auths', ArraySerializer(StringSerializer)],
  ['required_posting_auths', ArraySerializer(StringSerializer)],
  ['id', StringSerializer],
  ['json', StringSerializer]
])

OperationSerializers.decline_voting_rights = OperationDataSerializer(28, [
  ['account', StringSerializer],
  ['decline', BooleanSerializer]
])

OperationSerializers.delegate_vesting_shares = OperationDataSerializer(32, [
  ['delegator', StringSerializer],
  ['delegatee', StringSerializer],
  ['vesting_shares', AssetSerializer]
])

OperationSerializers.delete_comment = OperationDataSerializer(11, [
  ['author', StringSerializer],
  ['permlink', StringSerializer]
])

OperationSerializers.escrow_approve = OperationDataSerializer(23, [
  ['from', StringSerializer],
  ['to', StringSerializer],
  ['agent', StringSerializer],
  ['who', StringSerializer],
  ['escrow_id', UInt32Serializer],
  ['approve', BooleanSerializer]
])

OperationSerializers.escrow_dispute = OperationDataSerializer(21, [
  ['from', StringSerializer],
  ['to', StringSerializer],
  ['agent', StringSerializer],
  ['who', StringSerializer],
  ['escrow_id', UInt32Serializer]
])

OperationSerializers.escrow_release = OperationDataSerializer(22, [
  ['from', StringSerializer],
  ['to', StringSerializer],
  ['agent', StringSerializer],
  ['who', StringSerializer],
  ['receiver', StringSerializer],
  ['escrow_id', UInt32Serializer],
  ['hbd_amount', AssetSerializer],
  ['hive_amount', AssetSerializer]
])

OperationSerializers.escrow_transfer = OperationDataSerializer(20, [
  ['from', StringSerializer],
  ['to', StringSerializer],
  ['agent', StringSerializer],
  ['escrow_id', UInt32Serializer],
  ['hbd_amount', AssetSerializer],
  ['hive_amount', AssetSerializer],
  ['fee', AssetSerializer],
  ['ratification_deadline', DateSerializer],
  ['escrow_expiration', DateSerializer],
  ['json_meta', StringSerializer]
])

OperationSerializers.recover_account = OperationDataSerializer(18, [
  ['account_to_recover', StringSerializer],
  ['new_owner_authority', AuthoritySerializer],
  ['recent_owner_authority', AuthoritySerializer],
  ['extensions', ArraySerializer(VoidSerializer)]
])

OperationSerializers.request_account_recovery = OperationDataSerializer(17, [
  ['recovery_account', StringSerializer],
  ['account_to_recover', StringSerializer],
  ['new_owner_authority', AuthoritySerializer],
  ['extensions', ArraySerializer(VoidSerializer)]
])

OperationSerializers.reset_account = OperationDataSerializer(29, [
  ['reset_account', StringSerializer],
  ['account_to_reset', StringSerializer],
  ['new_owner_authority', AuthoritySerializer]
])

OperationSerializers.set_reset_account = OperationDataSerializer(30, [
  ['account', StringSerializer],
  ['current_reset_account', StringSerializer],
  ['reset_account', StringSerializer]
])

OperationSerializers.set_withdraw_vesting_route = OperationDataSerializer(14, [
  ['from_account', StringSerializer],
  ['to_account', StringSerializer],
  ['percent', UInt16Serializer],
  ['auto_vest', BooleanSerializer]
])

OperationSerializers.transfer = OperationDataSerializer(2, [
  ['from', StringSerializer],
  ['to', StringSerializer],
  ['amount', AssetSerializer],
  ['memo', StringSerializer]
])

OperationSerializers.transfer_from_savings = OperationDataSerializer(25, [
  ['from', StringSerializer],
  ['request_id', UInt32Serializer],
  ['to', StringSerializer],
  ['amount', AssetSerializer],
  ['memo', StringSerializer]
])

OperationSerializers.transfer_to_savings = OperationDataSerializer(24, [
  ['from', StringSerializer],
  ['to', StringSerializer],
  ['amount', AssetSerializer],
  ['memo', StringSerializer]
])

OperationSerializers.transfer_to_vesting = OperationDataSerializer(3, [
  ['from', StringSerializer],
  ['to', StringSerializer],
  ['amount', AssetSerializer]
])

OperationSerializers.vote = OperationDataSerializer(0, [
  ['voter', StringSerializer],
  ['author', StringSerializer],
  ['permlink', StringSerializer],
  ['weight', Int16Serializer]
])

OperationSerializers.withdraw_vesting = OperationDataSerializer(4, [
  ['account', StringSerializer],
  ['vesting_shares', AssetSerializer]
])

OperationSerializers.witness_update = OperationDataSerializer(7, [
  ['owner', StringSerializer],
  ['url', StringSerializer],
  ['block_signing_key', PublicKeySerializer],
  ['props', ChainPropertiesSerializer],
  ['fee', AssetSerializer]
])

const OperationSerializer = (buffer, operation) => {
  const serializer = OperationSerializers[operation[0]]
  if (!serializer) {
    throw new Error(`No serializer for operation: ${operation[0]}`)
  }
  try {
    serializer(buffer, operation[1])
  } catch (error) {
    error.message = `${operation[0]}: ${error.message}`
    throw error
  }
}

const TransactionSerializer = ObjectSerializer([
  ['ref_block_num', UInt16Serializer],
  ['ref_block_prefix', UInt32Serializer],
  ['expiration', DateSerializer],
  ['operations', ArraySerializer(OperationSerializer)],
  ['extensions', ArraySerializer(StringSerializer)]
])

const Types = {
  Array: ArraySerializer,
  Asset: AssetSerializer,
  Authority: AuthoritySerializer,
  Binary: BinarySerializer,
  Boolean: BooleanSerializer,
  Date: DateSerializer,
  FlatMap: FlatMapSerializer,
  Int16: Int16Serializer,
  Int32: Int32Serializer,
  Int64: Int64Serializer,
  Int8: Int8Serializer,
  Object: ObjectSerializer,
  Operation: OperationSerializer,
  Optional: OptionalSerializer,
  Price: PriceSerializer,
  PublicKey: PublicKeySerializer,
  StaticVariant: StaticVariantSerializer,
  String: StringSerializer,
  Transaction: TransactionSerializer,
  UInt16: UInt16Serializer,
  UInt32: UInt32Serializer,
  UInt64: UInt64Serializer,
  UInt8: UInt8Serializer,
  Void: VoidSerializer
}

module.exports = Types
