import { EosOscMessage } from './eos-osc-stream';
import { LogHandler } from './log';

export type OscRouteHandler = (
    message: EosOscMessage,
    params: Record<string, string>,
) => void;

interface OscTreeNode {
    type: string;
    childLiterals?: Record<string, OscLiteralTreeNode>;
    childParam?: OscParamTreeNode;
    childWildcard?: OscWildcardTreeNode;
    handler?: OscRouteHandler;
    value: string;
}

interface OscLiteralTreeNode extends OscTreeNode {
    type: 'literal';
}

interface OscParamTreeNode extends OscTreeNode {
    type: 'param';
}

interface OscWildcardTreeNode extends OscTreeNode {
    type: 'wildcard';
    value: '*';
}

/**
 * Routes OSC messages by their address pattern segments in the following order:
 *
 * 1. Full static match (`/eos/out/get/cue/1/count`)
 * 2. Full match with parameters (`/eos/out/get/cue/{cueList}/count`)
 * 3. Wildcards (`/eos/out/*`)
 */
export class OscRouter {
    private rootNode: OscTreeNode = { type: 'root', value: '' };

    constructor(private log?: LogHandler) {}

    on(addressPattern: string, handler: OscRouteHandler): this {
        // TODO: validate addressPattern

        const segments = addressPattern.split('/').slice(1);

        let currentNode: OscTreeNode = this.rootNode;

        for (const [i, segment] of segments.entries()) {
            if (segment === '*') {
                // Segment is a wildcard
                if (i !== segments.length - 1) {
                    throw new Error(
                        'wildcards may only be used at the end of a route',
                    );
                }

                if (currentNode.childWildcard) {
                    throw new Error(
                        `a route already exists for "${addressPattern}"`,
                    );
                }

                currentNode.childWildcard = {
                    type: 'wildcard',
                    value: '*',
                };
                currentNode = currentNode.childWildcard;
            } else {
                const paramName = OscRouter.extractParamName(segment);

                if (paramName) {
                    // Segment is a parameter
                    if (currentNode.childParam) {
                        if (currentNode.childParam.value !== paramName) {
                            throw new Error(
                                'route parameters must be consistently named',
                            );
                        }
                    } else {
                        currentNode.childParam = {
                            type: 'param',
                            value: paramName,
                        };
                    }

                    currentNode = currentNode.childParam;
                } else {
                    // Segment is a literal
                    if (!currentNode.childLiterals) {
                        currentNode.childLiterals = {
                            [segment]: {
                                type: 'literal',
                                value: segment,
                            },
                        };
                    } else if (!currentNode.childLiterals[segment]) {
                        currentNode.childLiterals[segment] = {
                            type: 'literal',
                            value: segment,
                        };
                    }

                    currentNode = currentNode.childLiterals[segment];
                }
            }
        }

        if (currentNode.handler) {
            throw new Error(`a route already exists for "${addressPattern}"`);
        }

        currentNode.handler = handler;

        this.log?.('debug', `Registered route "${addressPattern}"`);

        return this;
    }

    route(message: EosOscMessage) {
        let currentNode: OscTreeNode = this.rootNode;
        let foundHandler: OscRouteHandler | undefined;
        let foundWildcardHandler: OscRouteHandler | undefined;
        let fullMatch = true;
        const collectedParams: Record<string, string> = {};
        const debugSegments: string[] = [];

        const segments = message.address.split('/').slice(1);

        for (const segment of segments) {
            // Keep track of the latest wildcard match to be used as a fallback
            // if an exact match is not found
            if (currentNode.childWildcard?.handler) {
                foundWildcardHandler = currentNode.childWildcard.handler;
            }

            if (currentNode.childLiterals?.[segment]) {
                currentNode = currentNode.childLiterals[segment];

                debugSegments.push(segment);
            } else if (currentNode.childParam) {
                const param = currentNode.childParam.value;

                collectedParams[param] = segment;
                currentNode = currentNode.childParam;

                debugSegments.push(`{${param}}`);
            } else {
                fullMatch = false;
                break;
            }
        }

        if (fullMatch && currentNode.handler) {
            foundHandler = currentNode.handler;
        }

        let handled = false;

        if (foundHandler) {
            this.log?.(
                'debug',
                `Message "${
                    message.address
                }" matched to route "/${debugSegments.join('/')}"`,
            );

            foundHandler(message, collectedParams);
            handled = true;
        } else if (foundWildcardHandler) {
            this.log?.(
                'debug',
                `Message "${
                    message.address
                }" matched to route "/${debugSegments.join('/')}/*"`,
            );

            foundWildcardHandler(message, collectedParams);
            handled = true;
        }

        return handled;
    }

    prettyPrint() {
        this.traversePrint(this.rootNode);
    }

    private traversePrint(
        node: OscTreeNode,
        indentLevel = 0,
        isLast = false,
        dirLinesToSkip = 0,
    ) {
        const isLeaf =
            !node.childLiterals && !node.childParam && !node.childWildcard;

        let prefix = '';

        for (let i = 0; i < indentLevel; i++) {
            if (i > 0) {
                if (i > indentLevel - dirLinesToSkip - 1) {
                    prefix += '    ';
                } else {
                    prefix += '│   ';
                }
            }

            if (i === indentLevel - 1) {
                prefix += isLast ? '└── ' : `├── `;
            }
        }

        let controlStart = '';
        let controlEnd = '';

        if (node.handler) {
            // Print handlers in bold + green
            controlStart = '\x1b[1;32m';
            controlEnd = '\x1b[0m';
        }

        const label = node.type === 'param' ? `{${node.value}}` : node.value;
        const suffix = isLeaf ? '' : '/';

        // eslint-disable-next-line no-console
        console.log(`${prefix}${controlStart}${label}${controlEnd}${suffix}`);

        const children: OscTreeNode[] = [];

        if (node.childLiterals) {
            children.push(...Object.values(node.childLiterals));
        }

        if (node.childParam) {
            children.push(node.childParam);
        }

        if (node.childWildcard) {
            children.push(node.childWildcard);
        }

        for (const [i, child] of children.entries()) {
            const isLastChild = i === children.length - 1;

            this.traversePrint(
                child,
                indentLevel + 1,
                isLastChild,
                dirLinesToSkip + Number(isLast),
            );
        }
    }

    private static extractParamName(token: string) {
        if (token[0] !== '{' && token[token.length - 1] !== '}') {
            return;
        }

        return token.substring(1, token.length - 1);
    }
}
