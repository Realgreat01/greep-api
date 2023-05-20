import { isAuthenticated } from '@application/middlewares'
import { Route, StatusCodes, makeController } from 'equipped'
import { ReferralsController } from '../../controllers/users/referrals'

export const referralsRoutes: Route[] = [
	{
		path: '/users/referrals/',
		method: 'get',
		controllers: [
			isAuthenticated,
			makeController(async (req) => {
				return {
					status: StatusCodes.Ok,
					result: await ReferralsController.getReferrals(req)
				}
			})
		]
	},
	{
		path: '/users/referrals/:id',
		method: 'get',
		controllers: [
			isAuthenticated,
			makeController(async (req) => {
				return {
					status: StatusCodes.Ok,
					result: await ReferralsController.findReferral(req)
				}
			})
		]
	}
]