# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this
project adheres to [Semantic Versioning](http://semver.org/).

## [0.3.1] - 2023-12-21

### Changes

- Perform type checks when reading OSC arguments
- Simplify internal message routing logic
- Enable type checked ESLint rules

### Fixes

- Connect method will now only resolve once connected
- "Change user" (`/eos/user=<user ID>`) now encodes the user ID as an `int32`
- Fix `demo.ts` constructor args

## [0.3.0] - 2023-12-13

### Changes

- Preserve implicit output state and expose via read-only properties
- Parse show control implicit output
- Accept optional progress callback when requesting record target lists
- Allow a custom logging handler to be provided

### Fixes

- Support `null` for previous and pending cues, and inactive wheels

## [0.2.0] - 2023-11-19

### Changes

- Implement method to get individual patch channels
- Group patch parts by their parent channel

## [0.1.1] - 2023-11-14

- Initial release
