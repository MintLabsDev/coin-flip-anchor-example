import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CoinFlip } from "../target/types/coin_flip";
import { Keypair } from "@solana/web3.js";



process.env.ANCHOR_PROVIDER_URL = 'https://api.devnet.solana.com';
process.env.ANCHOR_WALLET = './key.json';

const provider = anchor.AnchorProvider.env()
anchor.setProvider(provider);

const program = new Program<CoinFlip>(
  require("../target/idl/coin_flip.json"),
  provider
);

async function main(decision:number, player:Keypair) {


  const playersDecision = { decision: new anchor.BN(decision) };

  const tx = await program.methods
    .getRandom(playersDecision)
    .accounts({
      signer: player.publicKey,
    })
    .signers([player])
    .rpc();

  console.log('Transaction signature:', tx);
}

