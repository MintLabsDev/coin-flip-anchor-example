# coin-flip-anchor-example
A simple coin flip game using feed protocol random number generator with anchor framework


Implementing Feed Protocol RNG to your program is very easy. You derive the needed accounts and pass into the instruction. And then in your program make a CPI to Feed Protocal RNG. 
In these simple example program we will cover every step of the implamaentation.
Lets say you want to build an on-chain coin flip game. 
First user chooses heads or tails and send this decision to your coinflip program. 
Your coin flip program calls Feed Protocol RNG. 
RNG program return a random number to your program.
You compare the returned random number with the user's decision in coinflip program.
Finally coin flip program logs a message according to result.
THIS ALL HAPPENS IN ONE TRANSACTION.
You can store the random number in an account in your program.
You can also try coinflip program on devnet and testnet

Now lets take a look at how we use Feed Protocol RNG in coinflip game program

# Derivation of accounts



Feed Protocol RNG Program address(It is the same address for devnet, testnet and mainnet-beta)

const rngProgram = new anchor.web3.PublicKey('9uSwASSU59XvUS8d1UeU8EwrEzMGFdXZvQ4JSEAfcS7k');

Deriving a PDA that store the required feed accounts

    const current_feeds_account = PublicKey.findProgramAddressSync(
       [Buffer.from("c"), Buffer.from([1])],
       rngProgram
     );

Getting account_info from the blockchain

    const currentFeedsAccountInfo = await connection.getAccountInfo(
      current_feeds_account[0]
    );


Parsing required data from the account data

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

Generating a keypair to use in RNG program

  const tempKeypair = anchor.web3.Keypair.generate();


# Creating Instruction

Player's decision(head or tails) is serialized to pass as instruction data. 

    const players_decision = new PlayersDecision();
    players_decision.decision = head_or_tails;
        
We create our instruction, then build it and finally send. Below account are necassary to CPI RNG program. 
You can also include the accounts you want to use in your program. 
However, when you make cpi into rng program the order of these accounts and their properties should be as below

            const ix = new TransactionInstruction({
      programId:coin_flip_program,
      keys:[
        {isSigner:true,isWritable:true,pubkey:payer.publicKey},
        {isSigner:false,isWritable:false,pubkey:feed_account_1},
        {isSigner:false,isWritable:false,pubkey:feed_account_2},
        {isSigner:false,isWritable:false,pubkey:feed_account_3},
        {isSigner:false,isWritable:false,pubkey:fallback_account},
        {isSigner:false,isWritable:true,pubkey:current_feeds_account[0]},
        {isSigner:true,isWritable:true,pubkey:temp.publicKey},
        {isSigner:false,isWritable:false,pubkey:rng_program},
        {isSigner:false,isWritable:false,pubkey:SystemProgram.programId},
      ],
      data:Buffer.from(encoded)});
  
  
      const message = new TransactionMessage({
        instructions: [ix],
          payerKey: payer.publicKey,
          recentBlockhash : (await connection.getLatestBlockhash()).blockhash
        }).compileToV0Message();
    
        const tx = new VersionedTransaction(message);
        tx.sign([payer,temp]);
  
      const sig = await connection.sendTransaction(tx);
           
# Coin flip program

We get our accounts

  let accounts_iter: &mut std::slice::Iter<'_, AccountInfo<'_>> = &mut accounts.iter();

    let payer: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let price_feed_account_1: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let price_feed_account_2: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let price_feed_account_3: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let fallback_account: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let current_feed_accounts: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let temp: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let rng_program: &AccountInfo<'_> = next_account_info(accounts_iter)?;
    let system_program: &AccountInfo<'_> = next_account_info(accounts_iter)?;

Creating account metas for CPI to RNG_PROGRAM

    let payer_meta = AccountMeta{ pubkey: *payer.key, is_signer: true, is_writable: true,};
    let price_feed_account_1_meta = AccountMeta{ pubkey: *price_feed_account_1.key, is_signer: false, is_writable: false,};
    let price_feed_account_2_meta = AccountMeta{ pubkey: *price_feed_account_2.key, is_signer: false, is_writable: false,};
    let price_feed_account_3_meta = AccountMeta{ pubkey: *price_feed_account_3.key, is_signer: false, is_writable: false,};
    let fallback_account_meta = AccountMeta{ pubkey: *fallback_account.key, is_signer: false, is_writable: false,};
    let current_feed_accounts_meta = AccountMeta{ pubkey: *current_feed_accounts.key, is_signer: false, is_writable: true,};
    let temp_meta = AccountMeta{ pubkey: *temp.key, is_signer: true, is_writable: true,};
    let system_program_meta = AccountMeta{ pubkey: *system_program.key, is_signer: false, is_writable: false,};


Creating instruction to cpi RNG PROGRAM

    let ix:Instruction = Instruction { program_id: *rng_program.key,
       accounts: [
        payer_meta,
        price_feed_account_1_meta,
        price_feed_account_2_meta,
        price_feed_account_3_meta,
        fallback_account_meta,
        current_feed_accounts_meta,
        temp_meta,
        system_program_meta,
       ].to_vec(), data: [0].to_vec() };

CPI to RNG_PROGRAM

    invoke(&ix, 
      &[
        payer.clone(),
        price_feed_account_1.clone(),
        price_feed_account_2.clone(),
        price_feed_account_3.clone(),
        fallback_account.clone(),
        current_feed_accounts.clone(),
        temp.clone(),
        system_program.clone()
        ])?;

Checking players input - zero is head, one is tails

    let players_decision: PlayersDecision = PlayersDecision::try_from_slice(&instruction_data)?;
    if players_decision.decision != 0 && players_decision.decision != 1 {panic!()}


    let returned_data:(Pubkey, Vec<u8>)= get_return_data().unwrap();

Random number is returned from the RNG_PROGRAM

    let random_number:RandomNumber;
    if &returned_data.0 == rng_program.key{
      random_number = RandomNumber::try_from_slice(&returned_data.1)?;
      msg!("{}",random_number.random_number);
    }else{
        panic!();
    }

We get the mod 2 of the random number. It is either one or zero

    let head_or_tails: u64 = random_number.random_number % 2;

Then we compare with the player's decision just log a message. you can put here your program logic

    if head_or_tails != players_decision.decision {
        msg!("you lost");
    }else{
        msg!("congragulations you win");
    }
