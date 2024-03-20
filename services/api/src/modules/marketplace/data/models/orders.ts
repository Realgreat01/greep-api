import { Currencies } from '@modules/payment'
import { Location } from '@utils/types'
import { CartProductItem, DeliveryTime, OrderPayment, OrderStatus } from '../../domain/types'

export interface OrderFromModel extends OrderToModel {
	_id: string
	driverId: string | null
	status: OrderStatus
	vendorId: string
	products: CartProductItem[]
	price: {
		amount: number
		currency: Currencies
	}
	accepted: {
		at: number
		message: number
		is: boolean
	} | null
	createdAt: number
	updatedAt: number
}

export interface OrderToModel {
	userId: string
	email: string
	cartId: string
	pickupLocation: Location
	location: Location
	dropoffNote: string
	time: DeliveryTime
	discount: number
	payment: OrderPayment
}
