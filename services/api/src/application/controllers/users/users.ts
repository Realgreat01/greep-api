import { StorageUseCases } from '@modules/storage'
import { UserType, UsersUseCases } from '@modules/users'
import { LocationSchema } from '@utils/types'
import { NotAuthorizedError, NotFoundError, QueryParams, Request, Schema, validate } from 'equipped'

export class UsersController {
	static async getUsers(req: Request) {
		const query = req.query as QueryParams
		query.auth = [{ field: 'dates.deletedAt', value: null }]
		return await UsersUseCases.get(query)
	}

	static async getUsersAdmin(req: Request) {
		const query = req.query as QueryParams
		return await UsersUseCases.get(query)
	}

	static async findUser(req: Request) {
		const user = await UsersUseCases.find(req.params.id)
		if (!user || user.isDeleted()) throw new NotFoundError()
		return user
	}

	static async findUserAdmin(req: Request) {
		const user = await UsersUseCases.find(req.params.id)
		if (!user) throw new NotFoundError()
		return user
	}

	static async updateType(req: Request) {
		const license = req.files.license?.at(0)
		const passport = req.files.passport?.at(0)
		const studentId = req.files.studentId?.at(0)

		const { data } = validate(
			{
				data: Schema.discriminate((v) => v.type, {
					[UserType.driver]: Schema.object({
						type: Schema.is(UserType.driver as const),
						license: Schema.file().image(),
					}),
					[UserType.customer]: Schema.object({
						type: Schema.is(UserType.customer as const),
						passport: Schema.file()
							.image()
							.requiredIf(() => !studentId),
						studentId: Schema.file()
							.image()
							.requiredIf(() => !passport),
					}),
				}),
			},
			{
				data: {
					...req.body,
					license,
					passport,
					studentId,
				},
			},
		)

		if (data.type === UserType.driver) {
			const license = await StorageUseCases.upload('users/drivers/licenses', data.license)
			const updated = await UsersUseCases.updateType({ userId: req.authUser!.id, data: { ...data, license } })
			if (updated) return updated
		} else if (data.type === UserType.customer) {
			const passport = data.passport ? await StorageUseCases.upload('users/customers/passport', data.passport) : null
			const studentId = data.studentId ? await StorageUseCases.upload('users/customers/studentId', data.studentId) : null
			const updated = await UsersUseCases.updateType({ userId: req.authUser!.id, data: { ...data, passport, studentId } })
			if (updated) return updated
		}

		throw new NotAuthorizedError('cannot update user type')
	}

	static async updateApplication(req: Request) {
		const { userId, accepted, message } = validate(
			{
				userId: Schema.string(),
				accepted: Schema.boolean(),
				message: Schema.string(),
			},
			req.body,
		)

		const updated = await UsersUseCases.updateApplication({ userId, data: { accepted, message } })
		if (updated) return updated
		throw new NotAuthorizedError('cannot update user application')
	}

	static async updateLocation(req: Request) {
		const { location } = validate(
			{
				location: Schema.tuple([Schema.number(), Schema.number()]),
			},
			req.body,
		)

		const updated = await UsersUseCases.updateLocation({ userId: req.authUser!.id, location })
		if (updated) return updated
		throw new NotAuthorizedError('cannot update user location')
	}

	static async updateDriverAvailability(req: Request) {
		const { available } = validate({ available: Schema.boolean() }, req.body)
		const user = await UsersUseCases.updateSettings({ userId: req.authUser!.id, settings: { driverAvailable: available } })
		return !!user
	}

	static async updateVendorLocation(req: Request) {
		const { location } = validate({ location: LocationSchema() }, req.body)

		const user = await UsersUseCases.updateVendorLocation({ userId: req.authUser!.id, location })
		if (user) return user
		throw new NotAuthorizedError('cannot update user vendor location')
	}

	static async updateSavedLocations(req: Request) {
		const { locations: savedLocations } = validate({ locations: Schema.array(LocationSchema()) }, req.body)

		const user = await UsersUseCases.updateSavedLocations({ userId: req.authUser!.id, savedLocations })
		if (user) return user
		throw new NotAuthorizedError('cannot update user saved locations')
	}
}
