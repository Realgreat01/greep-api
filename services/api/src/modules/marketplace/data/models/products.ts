import { Currencies } from '@modules/payment'
import { EmbeddedUser } from '@modules/users'
import { MediaOutput } from 'equipped'
import { ProductData, ProductMetaType } from '../../domain/types'

export interface ProductFromModel extends ProductToModel {
	_id: string
	meta: ProductMetaType
	createdAt: number
	updatedAt: number
}

export interface ProductToModel {
	title: string
	price: {
		amount: number
		currency: Currencies
	}
	data: ProductData
	user: EmbeddedUser
	description: string
	banner: MediaOutput
	tagIds: string[]
	inStock: boolean
}
