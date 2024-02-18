import { Location } from '@utils/types'
import { CartProductItem, DeliveryTime, OrderPayment } from '../../domain/types'

export interface OrderFromModel extends OrderToModel {
	_id: string
	products: CartProductItem[]
	createdAt: number
	updatedAt: number
}

export interface OrderToModel {
	userId: string
	cartId: string
	location: Location
	dropoffNote: string
	time: DeliveryTime
	discount: number
	payment: OrderPayment
}
