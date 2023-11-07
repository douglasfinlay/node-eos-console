import { EosOscMessage } from './eos-osc-stream';

export type OscRouteHandler = (
    message: EosOscMessage,
    params: Record<string, string>,
) => void;

interface OscTreeNode {
    childLiterals: Record<string, OscTreeNode>;
    childParam?: [string, OscTreeNode];
    handler?: OscRouteHandler;
}

/**
 * Routes OSC messages by their address pattern segments in the following order:
 *
 * 1. Full static match (`/eos/out/get/cue/1/count`)
 * 2. Full match with parameters (`/eos/out/get/cue/{cueList}/count`)
 * 3. TODO: Wildcards (`/eos/out/*`)
 */
export class OscRouter implements OscTreeNode {
    childLiterals: Record<string, OscTreeNode> = {};
    childParams: Record<string, OscTreeNode> = {};

    on(addressPattern: string, handler: OscRouteHandler): this {
        // TODO: validate addressPattern

        const segments = addressPattern.split('/').slice(1);

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let currentNode: OscTreeNode = this;

        for (const segment of segments) {
            const paramName = OscRouter.extractParamName(segment);

            if (paramName) {
                // Segment is a parameter
                if (currentNode.childParam) {
                    if (currentNode.childParam[0] !== paramName) {
                        throw new Error(
                            'route parameters must be consistently named',
                        );
                    }
                } else {
                    currentNode.childParam = [paramName, { childLiterals: {} }];
                }

                currentNode = currentNode.childParam[1];
            } else {
                // Segment is a literal
                if (!currentNode.childLiterals[segment]) {
                    currentNode.childLiterals[segment] = {
                        childLiterals: {},
                    };
                }

                currentNode = currentNode.childLiterals[segment];
            }
        }

        if (currentNode.handler) {
            throw new Error(`a route already exists for "${addressPattern}"`);
        }

        currentNode.handler = handler;

        return this;
    }

    route(message: EosOscMessage) {
        // console.log('Routing', message.address);

        const debugSegments: string[] = [];

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let currentNode: OscTreeNode = this;
        let matchingNode: OscTreeNode | undefined;
        let exactMatch = true;
        const collectedParams: Record<string, string> = {};

        const segments = message.address.split('/').slice(1);

        for (const segment of segments) {
            // console.log(`Checking "${segment}" against`, currentNode);

            if (
                Object.keys(currentNode.childLiterals).length &&
                currentNode.childLiterals[segment]
            ) {
                currentNode = currentNode.childLiterals[segment];

                // if (currentNode.wildcard) {
                //     matchingNode = currentNode;
                // }

                debugSegments.push(segment);
            } else if (currentNode.childParam) {
                const [paramName, paramNode] = currentNode.childParam;
                collectedParams[paramName] = segment;

                currentNode = paramNode;

                debugSegments.push(`{${paramName}}`);
            } else {
                exactMatch = false;
            }
        }

        if (exactMatch) {
            matchingNode = currentNode;
        }

        // console.log(debugSegments);

        let isHandled = false;

        if (matchingNode?.handler) {
            // console.log(
            //     `Message "${message.address}" handled by "/${debugSegments.join(
            //         '/',
            //     )}"`,
            // );
            // console.log(collectedParams);

            matchingNode.handler(message, collectedParams);
            isHandled = true;
        }

        return isHandled;
    }

    private static extractParamName(token: string) {
        if (token[0] !== '{' && token[token.length - 1] !== '}') {
            return;
        }

        return token.substring(1, token.length - 1);
    }
}
