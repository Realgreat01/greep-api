import { BadRequestError } from 'equipped'
import { IWalletRepository } from '../../domain/irepositories/wallets'
import { TransactionStatus, TransactionType, TransferData, WithdrawData, WithdrawalStatus } from '../../domain/types'
import { WalletMapper } from '../mappers/wallets'
import { TransactionToModel } from '../models/transactions'
import { Transaction } from '../mongooseModels/transactions'
import { Wallet } from '../mongooseModels/wallets'
import { WithdrawalToModel } from '../models/withdrawals'
import { Withdrawal } from '../mongooseModels/withdrawals'

export class WalletRepository implements IWalletRepository {
	private static instance: WalletRepository
	private mapper: WalletMapper

	private constructor () {
		this.mapper = new WalletMapper()
	}

	static getInstance () {
		if (!WalletRepository.instance) WalletRepository.instance = new WalletRepository()
		return WalletRepository.instance
	}

	private static async getUserWallet (userId: string, session?: any) {
		const wallet = await Wallet.findOneAndUpdate(
			{ userId },
			{ $setOnInsert: { userId } },
			{ upsert: true, new: true, ...(session ? { session } : {}) })
		return wallet!
	}

	async get (userId: string) {
		const wallet = await WalletRepository.getUserWallet(userId)
		return this.mapper.mapFrom(wallet)!
	}

	async updateAmount (userId: string, amount: number) {
		let res = false
		await Wallet.collection.conn.transaction(async (session) => {
			const wallet = this.mapper.mapFrom(await WalletRepository.getUserWallet(userId, session))!
			const updatedBalance = wallet.balance.amount + amount
			if (updatedBalance < 0) throw new BadRequestError('wallet balance can\'t go below 0')
			res = !!(await Wallet.findByIdAndUpdate(wallet.id,
				{ $inc: { 'balance.amount': amount } },
				{ new: true, session }
			))
			return res
		})
		return res
	}

	async transfer (data: TransferData) {
		let res = false
		await Wallet.collection.conn.transaction(async (session) => {
			const fromWallet = this.mapper.mapFrom(await WalletRepository.getUserWallet(data.from, session))!
			const toWallet = this.mapper.mapFrom(await WalletRepository.getUserWallet(data.to, session))!
			const updatedBalance = fromWallet.balance.amount - data.amount
			if (updatedBalance < 0) throw new BadRequestError('insufficient balance')
			const transactions: TransactionToModel[] = [
				{
					userId: data.from,
					email: data.fromEmail,
					title: `You sent money to ${data.toName}`,
					amount: 0 - data.amount,
					currency: fromWallet.balance.currency,
					status: TransactionStatus.settled,
					data: { type: TransactionType.Sent, note: data.note, to: data.to, toName: data.toName }
				}, {
					userId: data.to,
					email: data.toEmail,
					title: `You received money from ${data.fromName}`,
					amount: data.amount,
					currency: fromWallet.balance.currency,
					status: TransactionStatus.settled,
					data: { type: TransactionType.Received, note: data.note, from: data.from, fromName: data.fromName }
				}
			]
			await Transaction.insertMany(transactions, { session })
			const updatedFromWallet =  await Wallet.findByIdAndUpdate(fromWallet.id,
				{ $inc: { 'balance.amount': 0 - data.amount } },
				{ new: true, session }
			)
			const updatedToWallet =  await Wallet.findByIdAndUpdate(toWallet.id,
				{ $inc: { 'balance.amount': data.amount } },
				{ new: true, session }
			)
			res = !!updatedFromWallet && !!updatedToWallet
			return res
		})
		return res
	}

	async withdraw (data: WithdrawData) {
		let res = false
		await Wallet.collection.conn.transaction(async (session) => {
			const wallet = this.mapper.mapFrom(await WalletRepository.getUserWallet(data.userId, session))!
			const fee = 0
			const deductingAmount = data.amount + fee
			const updatedBalance = wallet.balance.amount - deductingAmount
			if (updatedBalance < 0) throw new Error('insufficient balance')
			const withdrawalModel: WithdrawalToModel = {
				userId: data.userId,
				email: data.email,
				amount: data.amount,
				fee,
				currency: wallet.balance.currency,
				status: WithdrawalStatus.created,
			}
			const withdrawal = await new Withdrawal(withdrawalModel).save({ session })
			const transaction: TransactionToModel = {
				userId: data.userId,
				email: data.email,
				title: 'You withdrew money',
				amount: 0 - deductingAmount,
				currency: wallet.balance.currency,
				status: TransactionStatus.settled,
				data: { type: TransactionType.Withdrawal, withdrawalId: withdrawal._id }
			}
			await new Transaction(transaction).save({ session })
			const updatedWallet = await Wallet.findByIdAndUpdate(wallet.id,
				{ $inc: { 'balance.amount': transaction.amount } },
				{ new: true, session }
			)
			res = !!updatedWallet
			return res
		})
		return res
	}

	async updatePin (userId: string, oldPin: string | null, pin: string) {
		const wallet = this.mapper.mapFrom(await WalletRepository.getUserWallet(userId))!
		if (wallet.pin !== oldPin) throw new BadRequestError('invalid pin')
		return !!await Wallet.findByIdAndUpdate(wallet.id, { pin }, { new: true })
	}
}
