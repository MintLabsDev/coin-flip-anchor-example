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

  const playersDecision = { decision: new anchor.BN(decision) };

        
We create our instruction, then build it and finally send. Below account are necassary to CPI RNG program. 
You can also include the accounts you want to use in your program. 
However, when you make cpi into rng program the order of these accounts and their properties should be as below


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
           
# Coin flip program


Creating instruction for cross program invocation to RNG_PROGRAM
        let instruction: Instruction = Instruction {
            program_id: *rng_program,
            accounts: vec![
                ctx.accounts.signer.to_account_metas(Some(true))[0].clone(),
                ctx.accounts.feed_account_1.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.feed_account_2.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.feed_account_3.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.fallback_account.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.current_feeds_account.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.temp.to_account_metas(Some(true))[0].clone(),
                ctx.accounts.system_program.to_account_metas(Some(false))[0].clone(),
            ],
            data: vec![0],
        };

Creating account infos for CPI to RNG_PROGRAM

        let account_infos: &[AccountInfo; 8] = &[
            ctx.accounts.signer.to_account_info().clone(),
            ctx.accounts.feed_account_1.to_account_info().clone(),
            ctx.accounts.feed_account_2.to_account_info().clone(),
            ctx.accounts.feed_account_3.to_account_info().clone(),
            ctx.accounts.fallback_account.to_account_info().clone(),
            ctx.accounts.current_feeds_account.to_account_info().clone(),
            ctx.accounts.temp.to_account_info().clone(),
            ctx.accounts.system_program.to_account_info().clone(),
        ];

CPI to RNG_PROGRAM

        invoke(&instruction, account_infos)?;

        let returned_data: (Pubkey, Vec<u8>) = get_return_data().unwrap();

Random number is returned from the RNG_PROGRAM

        let random_number: RandomNumber;
        if &returned_data.0 == rng_program {
            random_number = RandomNumber::try_from_slice(&returned_data.1)?;
            msg!("{}", random_number.random_number);


        } else {
            return Err(ErrorCode::FailedToGetRandomNumber.into());
        }

Checking players input - zero is head, one is tails

        if players_decision.decision != 0 && players_decision.decision != 1 {
            return Err(ErrorCode::InvalidDecision.into());
        }
        
we get the mod 2 of the random number. It is either one or zero
then we compare with the player's decision just log a message. you can put here your program logic

        if random_number.random_number % 2 == players_decision.decision{
            msg!("congragulations you win");
        }else{
            msg!("you lost");
        }

Accounts' signer and writable properties are necessary when we call RNG program

    #[derive(Accounts)]
    pub struct GetRand<'info> {
        #[account(mut)]
        pub signer: Signer<'info>,
        /// CHECK:
        pub feed_account_1: AccountInfo<'info>,
        /// CHECK:
        pub feed_account_2: AccountInfo<'info>,
        /// CHECK:
        pub feed_account_3: AccountInfo<'info>,
        /// CHECK:
        pub fallback_account: AccountInfo<'info>,
        #[account(mut)]
        /// CHECK:
        pub current_feeds_account: AccountInfo<'info>,
        #[account(mut)]
        /// CHECK:
        pub temp: Signer<'info>,
        /// CHECK:
        pub rng_program: AccountInfo<'info>,
    
        pub system_program: Program<'info, System>,
    }