import { OscMessage } from './osc';

export class OscArgumentListJoiner {
    /**
     * Regular expression to match an OSC list convention address ending with
     * `/list/<list index>/<list count>`.
     */
    private static readonly ADDRESS_SUFFIX = /\/list\/(\d+)\/(\d+)$/;

    private partialMessage: OscMessage | null = null;

    /**
     * @returns the unaltered message if it does not follow the OSC list
     * convention, the full message minus the list convention suffix if all
     * arguments have been collected, or `null` if there are still more
     * arguments to collect
     */
    process(message: OscMessage): OscMessage | null {
        const matches = OscArgumentListJoiner.ADDRESS_SUFFIX.exec(
            message.address,
        );

        if (matches) {
            // Strip the `/list/<list index>/<list count>` suffix
            message.address = message.address.substring(0, matches.index);
            const expectedArgCount = parseInt(matches[2]);

            // If a partial set of args has been received, we need to accumulate
            // arguments from future messages
            if (message.args.length < expectedArgCount) {
                const argListIndex = parseInt(matches[1]);

                // First message; store with its partial list of arguments
                if (argListIndex === 0) {
                    this.partialMessage = new OscMessage(
                        message.address,
                        message.args,
                    );

                    return null;
                }

                // Otherwise, keep collecting args until we have received the
                // expected amount

                if (!this.partialMessage) {
                    throw new Error(
                        `no partial argument list found for "${message.address}"`,
                    );
                }

                if (this.partialMessage.args.length !== argListIndex) {
                    throw new Error(`received out-of-sequence argument list`);
                }

                // Join with existing args
                this.partialMessage.args.splice(
                    argListIndex,
                    message.args.length,
                    ...message.args,
                );

                if (this.partialMessage.args.length < expectedArgCount) {
                    // We still have more arguments to collect
                    return null;
                }

                // At this point all arguments have been received, so release
                // the complete message
                message = this.partialMessage;
                this.partialMessage = null;
            }
        } else if (this.partialMessage) {
            throw new Error('expected continuation of partial argument list');
        }

        return message;
    }
}
