use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};

declare_id!("5uNCDQwxG8dgdFsAYMzb6DS442bLbRp85P2dAn15rt4d");

#[program]
mod coin_flip {
    use anchor_lang::solana_program::{instruction::Instruction, program::{get_return_data, invoke}};

    use super::*;

    pub fn get_random(ctx: Context<GetRand>, players_decision:PlayersDecision) -> Result<()> {
        let rng_program: &Pubkey = ctx.accounts.rng_program.key;
   
        //Creating instruction for cross program invocation to RNG_PROGRAM
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

        //Creating account infos for CPI to RNG_PROGRAM
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

        //CPI to RNG_PROGRAM
        invoke(&instruction, account_infos)?;

        let returned_data: (Pubkey, Vec<u8>) = get_return_data().unwrap();

        //Random number is returned from the RNG_PROGRAM
        let random_number: RandomNumber;
        if &returned_data.0 == rng_program {
            random_number = RandomNumber::try_from_slice(&returned_data.1)?;
            msg!("{}", random_number.random_number);


        } else {
            return Err(ErrorCode::FailedToGetRandomNumber.into());
        }

        //Checking players input - zero is head, one is tails
        if players_decision.decision != 0 && players_decision.decision != 1 {
            return Err(ErrorCode::InvalidDecision.into());
        }
        
        //we get the mod 2 of the random number. It is either one or zero
        //then we compare with the player's decision just log a message. you can put here your program logic
        if random_number.random_number % 2 == players_decision.decision{
            msg!("congragulations you win");
        }else{
            msg!("you lost");
        }

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug)]
pub struct PlayersDecision {
    pub decision: u64,
}

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct RandomNumber {
    pub random_number: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Failed to get random number.")]
    FailedToGetRandomNumber,

    #[msg("The decision is invalid.")]
    InvalidDecision,
}


#[derive(Accounts)]
pub struct GetRand<'info> {
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
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

