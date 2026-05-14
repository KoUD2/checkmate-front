module.exports = {
	preset: 'ts-jest',
	moduleFileExtensions: ['js', 'json', 'ts'],
	rootDir: 'src',
	testRegex: '.*\\.spec\\.ts$',
	transform: {
		'^.+\\.(t|j)s$': 'ts-jest',
	},
	testEnvironment: 'node',
	collectCoverageFrom: ['**/*.(t|j)s'],
	coverageDirectory: '../coverage',
};
