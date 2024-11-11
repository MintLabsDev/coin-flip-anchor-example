# Coin Flip Anchor Example
A simple coin flip game using feed FEED PROTOCOL RANDOM NUMBER GENERATOR PROGRAM with anchor framework


Implementing FEED PROTOCOL RANDOM NUMBER GENERATOR PROGRAM (FPRNG) to your program is very easy. You derive the needed accounts and pass into the instruction. And then in your program make a CPI to FPRNG. 
In these simple example program we will cover every step of the implementation.
Lets say you want to build an on-chain coin flip game. 
First user chooses heads or tails and send this decision to your coinflip program. 
Your coin flip program calls FPRNG. 
FPRNG return a random number to your program.
You compare the returned random number with the user's decision in coinflip program.
Finally coin flip program logs a message according to result.
THIS ALL HAPPENS IN ONE TRANSACTION.
You can store the random number in an account in your program.
You can also try coinflip program on Devnet and Testnet.

Now lets take a look at how we use FPRNG in coinflip game program

# Derivation of accounts



FPRNG addresses(It is the same address for devnet, testnet and mainnet-beta)
```
const rngProgram = new anchor.web3.PublicKey('FEED1qspts3SRuoEyG29NMNpsTKX8yG9NGMinNC4GeYB');
```


# Creating Instruction

Player's decision(head or tails) is serialized to pass as instruction data. 
```
  const playersDecision = { decision: new anchor.BN(decision) };
```
        
We create our instruction, then build it and finally send. Anchor handles entropy_account, fee_account and rng_program_account for us, because we defined them as constant accounts

```
  const tx = await program.methods
    .getRandom(playersDecision)
    .accounts({
      signer: player.publicKey,
    })
    .signers([player, tempKeypair])
    .rpc();

```   
# Coin flip program


Creating instruction for cross program invocation to FPRNG

```
        let instruction: Instruction = Instruction {
            program_id: *rng_program,
            accounts: vec![
                ctx.accounts.signer.to_account_metas(Some(true))[0].clone(),
                ctx.accounts.entropy_account.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.fee_account.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.system_program.to_account_metas(Some(false))[0].clone(),
                ctx.accounts.credits_account.to_account_metas(Some(false))[0].clone(),
            ],
            data: vec![100],
        };


```

Creating account infos for CPI to FPRNG
```
        let account_infos: &[AccountInfo; 4] = &[
            ctx.accounts.signer.to_account_info().clone(),
            ctx.accounts.entropy_account.to_account_info().clone(),
            ctx.accounts.fee_account.to_account_info().clone(),
            ctx.accounts.system_program.to_account_info().clone(),
            ctx.accounts.credits_account.to_account_info().clone(),
        ];
```
CPI to FPRNG
```
  invoke(&instruction, account_infos)?;

  let returned_data: (Pubkey, Vec<u8>) = get_return_data().unwrap();
```

Random number is returned from the FPRNG
```
  let random_number: RandomNumber;
  if &returned_data.0 == rng_program {
      random_number = RandomNumber::try_from_slice(&returned_data.1)?;
      msg!("{}", random_number.random_number);
  } else {
      return Err(ErrorCode::FailedToGetRandomNumber.into());
  }
```
Checking players input - zero is head, one is tails
```
  if players_decision.decision != 0 && players_decision.decision != 1 {
      return Err(ErrorCode::InvalidDecision.into());
  }
```  
we get the mod 2 of the random number. It is either one or zero
then we compare with the player's decision just log a message. you can put here your program logic
```
  if random_number.random_number % 2 == players_decision.decision{
      msg!("congragulations you win");
  }else{
      msg!("you lost");
  }
```
Accounts' signer and writable properties are necessary when we call FPRNG
credits_account is optional when you call FPRNG program. You don't need to pass into CPI. 
If you call FPRNG program with credits, the program will not charge per request and instead it decrease your credits.
You can take a look at feedprotocol.xyz to get more info about credits 
```
const ENTROPY_ACCOUNT_ADDRESS: Pubkey = pubkey!("CTyyJKQHo6JhtVYBaXcota9NozebV3vHF872S8ag2TUS");
const FEE_ACCOUNT_ADDRESS: Pubkey = pubkey!("WjtcArL5m5peH8ZmAdTtyFF9qjyNxjQ2qp4Gz1YEQdy");
const RNG_PROGRAM_ADDRESS: Pubkey = pubkey!("FEED1qspts3SRuoEyG29NMNpsTKX8yG9NGMinNC4GeYB");

#[derive(Accounts)]
pub struct GetRand<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, address = ENTROPY_ACCOUNT_ADDRESS)]
    /// CHECK: constant address
    pub entropy_account: AccountInfo<'info>,

    #[account(mut, address = FEE_ACCOUNT_ADDRESS)]
    /// CHECK: constant address
    pub fee_account: AccountInfo<'info>,

    #[account(address = RNG_PROGRAM_ADDRESS)]
    /// CHECK: constant address
    pub rng_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,

        #[account(
        mut,
        seeds = [signer.key().as_ref(), rng_program.key().as_ref()],
        bump
    )]
    /// CHECK: This is a PDA for the RNG program
    pub credits_account: AccountInfo<'info>,
}
```
