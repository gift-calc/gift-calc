## [2.2.2](https://github.com/gift-calc/gift-calc/compare/v2.2.1...v2.2.2) (2025-09-07)


### Bug Fixes

* add proper semantic versioning tags for Docker images ([4a1e9da](https://github.com/gift-calc/gift-calc/commit/4a1e9dae407adf9d2d0060a0edc870ecf9b7fc66))

## [2.2.1](https://github.com/gift-calc/gift-calc/compare/v2.2.0...v2.2.1) (2025-09-07)


### Bug Fixes

* correct Docker Hub repository name to davidnossebro/gift-calc ([cc418c1](https://github.com/gift-calc/gift-calc/commit/cc418c1be8a829122679a6c799ead4a1bc0a7734))

# [2.2.0](https://github.com/gift-calc/gift-calc/compare/v2.1.0...v2.2.0) (2025-09-07)


### Features

* add Docker security and platform details to documentation ([e94992f](https://github.com/gift-calc/gift-calc/commit/e94992fdd9e68829bd3322247eb3834e967b6518))

# [2.1.0](https://github.com/gift-calc/gift-calc/compare/v2.0.0...v2.1.0) (2025-09-07)


### Features

* add Docker support with automated publishing to Docker Hub ([9aaaa80](https://github.com/gift-calc/gift-calc/commit/9aaaa80a24c4c547b37a36860076c6426c389a8f)), closes [#3](https://github.com/gift-calc/gift-calc/issues/3)

# [2.0.0](https://github.com/gift-calc/gift-calc/compare/v1.4.0...v2.0.0) (2025-09-07)


* feat!: standardize CLI parameters for POSIX/GNU compliance ([18be553](https://github.com/gift-calc/gift-calc/commit/18be553e1bb992a773645d67a7dbceefc1026185))


### BREAKING CHANGES

* Updated CLI parameter structure to follow universal standards

- Changed -v from variation to version (universal CLI standard)
- Changed variation parameter from -v to -r (POSIX single-char compliance)
- Changed copy parameter from -cp to -C (POSIX single-char compliance)
- Added -V as alternative version flag following conventions
- Reordered help options to show version first (standard practice)

Benefits:
- Aligns with decades of CLI conventions users expect
- Follows GNU/POSIX standards for parameter naming
- Improves consistency with other command-line tools
- Maintains all existing functionality via long-form options

Updated documentation:
- All help text and examples updated
- CLAUDE.md synchronized with new parameters
- All 160 tests updated and passing
- Website documentation will be updated separately

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>

# [1.4.0](https://github.com/gift-calc/gift-calc/compare/v1.3.2...v1.4.0) (2025-09-07)


### Bug Fixes

* address PR review comments - case sensitivity and input validation ([4dad8f6](https://github.com/gift-calc/gift-calc/commit/4dad8f63cc1ec220fd6c1d29598d7524d7710a38))


### Features

* implement comprehensive naughty list management system ([6061a40](https://github.com/gift-calc/gift-calc/commit/6061a40eef0d345425aa1eff2a4a7211cd8a35d2))

## [1.3.2](https://github.com/gift-calc/gift-calc/compare/v1.3.1...v1.3.2) (2025-09-06)


### Bug Fixes

* enhance help text with occasion examples ([cb41a83](https://github.com/gift-calc/gift-calc/commit/cb41a833e4ca7ed4cea4ca924244e513f6d4ec42))

## [1.3.1](https://github.com/gift-calc/gift-calc/compare/v1.3.0...v1.3.1) (2025-09-06)


### Bug Fixes

* enhance help text description with occasion examples ([b6541ff](https://github.com/gift-calc/gift-calc/commit/b6541ffb86cf403931b508cec99826dff9ae9733))

# [1.3.0](https://github.com/gift-calc/gift-calc/compare/v1.2.1...v1.3.0) (2025-09-06)


### Bug Fixes

* correct test assertion syntax in config test ([64da6bc](https://github.com/gift-calc/gift-calc/commit/64da6bcd43551b013b7c7a482d7a2d23d891608f))
* make log test cross-platform compatible by handling different timeout commands ([43009cb](https://github.com/gift-calc/gift-calc/commit/43009cbc1d524d5d31e179d605f7b41feb08516a))
* update tests to match new version output format ([a4c0f0d](https://github.com/gift-calc/gift-calc/commit/a4c0f0d9ffbee2cdafd166b90e0f13c7810bc7ed))


### Features

* add 'v' prefix to version output format ([9702957](https://github.com/gift-calc/gift-calc/commit/97029578662f8071e28fdfdef8c6c297cc710e62))
* add application name to version output ([e877c7b](https://github.com/gift-calc/gift-calc/commit/e877c7b45918b9cbb128dbd55f8203457625bae1))
* replace custom workflow with semantic-release for robust publishing ([c24962c](https://github.com/gift-calc/gift-calc/commit/c24962c4f9759d5e822295ab50b22f982759a3ae))

# 1.0.0 (2025-09-06)


### Bug Fixes

* make log test cross-platform compatible by handling different timeout commands ([43009cb](https://github.com/gift-calc/gift-calc/commit/43009cbc1d524d5d31e179d605f7b41feb08516a))
* update tests to match new version output format ([a4c0f0d](https://github.com/gift-calc/gift-calc/commit/a4c0f0d9ffbee2cdafd166b90e0f13c7810bc7ed))


### Features

* add 'v' prefix to version output format ([9702957](https://github.com/gift-calc/gift-calc/commit/97029578662f8071e28fdfdef8c6c297cc710e62))
* replace custom workflow with semantic-release for robust publishing ([c24962c](https://github.com/gift-calc/gift-calc/commit/c24962c4f9759d5e822295ab50b22f982759a3ae))
