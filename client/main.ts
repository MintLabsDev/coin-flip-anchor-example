import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CoinFlip } from "../target/types/coin_flip";
import { PublicKey,Keypair } from "@solana/web3.js";
import { deserialize } from "borsh";
import bs58 from "bs58";




export class CurrentFeed {
  is_init: number = 0;
  fee: number = 0;
  offset1: number = 0;
  offset2: number = 0;
  offset3: number = 0;
  offset4: number = 0;
  offset5: number = 0;
  offset6: number = 0;
  offset7: number = 0;
  offset8: number = 0;
  account1: number[] = Array.from({ length: 32 }, () => 1);
  account2: number[] = Array.from({ length: 32 }, () => 1);
  account3: number[] = Array.from({ length: 32 }, () => 1);
  fallback_account: number[] = Array.from({ length: 32 }, () => 1);
  bump: number = 0;

  constructor(
    fields:
      | {
          is_init: number;
          fee: number;
          offset1: number;
          offset2: number;
          offset3: number;
          offset4: number;
          offset5: number;
          offset6: number;
          offset7: number;
          offset8: number;
          account1: number[];
          account2: number[];
          account3: number[];
          fallback_account: number[];
          bump: number;
        }
      | undefined = undefined
  ) {
    if (fields) {
      this.is_init = fields.is_init;
      this.fee = fields.fee;
      this.offset1 = fields.offset1;
      this.offset2 = fields.offset2;
      this.offset3 = fields.offset3;
      this.offset4 = fields.offset4;
      this.offset5 = fields.offset5;
      this.offset6 = fields.offset6;
      this.offset7 = fields.offset7;
      this.offset8 = fields.offset8;
      this.account1 = fields.account1;
      this.account2 = fields.account2;
      this.account3 = fields.account3;
      this.fallback_account = fields.fallback_account;
      this.bump = fields.bump;
    }
  }
}
export const CurrentFeedSchema = new Map([
  [
    CurrentFeed,
    {
      kind: "struct",
      fields: [
        ["is_init", "u8"],
        ["fee", "u64"],
        ["offset1", "u8"],
        ["offset2", "u8"],
        ["offset3", "u8"],
        ["offset4", "u8"],
        ["offset5", "u8"],
        ["offset6", "u8"],
        ["offset7", "u8"],
        ["offset8", "u8"],
        ["account1", ["u8", 32]],
        ["account2", ["u8", 32]],
        ["account3", ["u8", 32]],
        ["fallback_account", ["u8", 32]],
        ["bump", "u8"],
      ],
    },
  ],
]);

const authority = Keypair.fromSecretKey(Uint8Array.from([153,187,227,210,27,108,215,173,44,244,
  156,74,194,28,155,122,71,217,19,208,234,242,206,140,90,56,195,207,
  73,113,207,157,220,189,39,249,130,185,164,194,196,55,144,15,84,36,233,49,66,177,100,45,220,200,
  12,207,135,110,74,254,221,39,178,75]))

const rngProgram = new anchor.web3.PublicKey('9uSwASSU59XvUS8d1UeU8EwrEzMGFdXZvQ4JSEAfcS7k');
process.env.ANCHOR_PROVIDER_URL = 'https://api.devnet.solana.com';
process.env.ANCHOR_WALLET = './key.json';

const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider);

const program = new Program<CoinFlip>(
  require("../target/idl/coin_flip.json"),
  provider
);

async function main(decision:number, player:Keypair) {



  const connection = program.provider.connection;


  const current_feeds_account = PublicKey.findProgramAddressSync(
    [Buffer.from("c"), Buffer.from([1])],
    rngProgram
  );


  const currentFeedsAccountInfo = await connection.getAccountInfo(
    current_feeds_account[0]
  );
  const currentFeedsAccountData = deserialize(
    CurrentFeedSchema,
    CurrentFeed,
    currentFeedsAccountInfo?.data!
  );

  const feedAccount1 = new PublicKey(
    bs58.encode(currentFeedsAccountData.account1).toString()
  );
  const feedAccount2 = new PublicKey(
    bs58.encode(currentFeedsAccountData.account2).toString()
  );
  const feedAccount3 = new PublicKey(
    bs58.encode(currentFeedsAccountData.account3).toString()
  );

  const fallbackAccount = new PublicKey(
    bs58.encode(currentFeedsAccountData.fallback_account).toString()
  );

  const tempKeypair = anchor.web3.Keypair.generate();

  const playersDecision = { decision: new anchor.BN(decision) };

  const tx = await program.methods
    .getRandom(playersDecision)
    .accounts({
      signer: player.publicKey,
      feedAccount1: feedAccount1,
      feedAccount2: feedAccount2,
      feedAccount3: feedAccount3,
      fallbackAccount: fallbackAccount,
      currentFeedsAccount: current_feeds_account[0],
      temp: tempKeypair.publicKey,
      rngProgram: rngProgram,
    })
    .signers([player, tempKeypair])
    .rpc();

  console.log('Transaction signature:', tx);
}




main(1,authority)