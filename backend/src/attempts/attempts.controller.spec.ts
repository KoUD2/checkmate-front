import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { UpsertAnswerDto } from './dto/upsert-answer.dto'
import { SkipSectionDto } from './dto/skip-section.dto'
import { AttemptsController } from './attempts.controller'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

describe('AttemptsController', () => {
	it('UpsertAnswerDto accepts { content: "hello" } (ATTEMPT-04)', async () => {
		const dto = plainToInstance(UpsertAnswerDto, { content: 'hello' })
		const errors = await validate(dto)
		expect(errors).toHaveLength(0)
	})

	it('UpsertAnswerDto accepts { content: null } (ATTEMPT-04)', async () => {
		const dto = plainToInstance(UpsertAnswerDto, { content: null })
		const errors = await validate(dto)
		expect(errors).toHaveLength(0)
	})

	it('SkipSectionDto rejects invalid section enum value (ATTEMPT-06)', async () => {
		const dto = plainToInstance(SkipSectionDto, { section: 'INVALID', skip: true })
		const errors = await validate(dto)
		expect(errors.find(e => e.property === 'section')).toBeDefined()
	})

	it('SkipSectionDto rejects non-boolean skip value (ATTEMPT-06)', async () => {
		const dto = plainToInstance(SkipSectionDto, { section: 'WRITING', skip: 'yes' })
		const errors = await validate(dto)
		expect(errors.find(e => e.property === 'skip')).toBeDefined()
	})

	it('JwtAuthGuard is applied at class level on AttemptsController (no per-method guards) (Auth bypass)', () => {
		const guards = Reflect.getMetadata('__guards__', AttemptsController) as Array<new (...args: unknown[]) => unknown>
		expect(guards).toBeDefined()
		expect(guards).toContain(JwtAuthGuard)
		expect(Reflect.getMetadataKeys(AttemptsController.prototype).filter(k => String(k).startsWith('__guards__'))).toHaveLength(0)
	})
})
