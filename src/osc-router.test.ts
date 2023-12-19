import { assert } from 'chai';
import { OscRouteHandler, OscRouter } from './osc-router';
import { OscMessage } from './osc';

describe('OSC router', () => {
    describe('on', () => {
        const dummyHandler: OscRouteHandler = () => {
            /* ... */
        };

        let router: OscRouter;

        beforeEach(() => {
            router = new OscRouter();
        });

        it('Should accept well-formed routes', () => {
            ['/*', '/wildcard/*', '/route/test', '/route/{param}/test'].map(
                address => {
                    assert.doesNotThrow(() => router.on(address, dummyHandler));
                },
            );
        });

        it('Should enforce consistent route parameter names', () => {
            assert.doesNotThrow(() => {
                router.on('/*', dummyHandler);
            });

            assert.doesNotThrow(() => {
                router.on('/wildcard/route/*', dummyHandler);
            });

            assert.throws(() => {
                router.on('/*/route', dummyHandler);
            });
        });

        it('Should only permit wildcards at the end of a route', () => {
            assert.doesNotThrow(() => {
                router.on('/*', dummyHandler);
            });

            assert.doesNotThrow(() => {
                router.on('/wildcard/route/*', dummyHandler);
            });

            assert.throws(() => {
                router.on('/*/route', dummyHandler);
            });
        });

        it('Should reject duplicate routes', () => {
            assert.doesNotThrow(() => {
                router.on('/duplicate/route', dummyHandler);
            });

            assert.doesNotThrow(() => {
                router.on('/another/route', dummyHandler);
            });

            assert.throws(() => {
                router.on('/duplicate/route', dummyHandler);
            });
        });
    });

    describe('route', () => {
        const router = new OscRouter();
        const routes = [
            '/route/*',
            '/route/test/*',
            '/route/test/{param}/match',
            '/route/test/literal/match',
        ];

        let lastMatch: string | null = null;

        before(() => {
            for (const route of routes) {
                router.on(route, () => {
                    lastMatch = route;
                });
            }
        });

        beforeEach(() => {
            lastMatch = null;
        });

        it('Should prioritise exact (literal) matches over param and wildcard matches', () => {
            const handled = router.route(
                new OscMessage('/route/test/literal/match'),
            );

            assert.isTrue(handled);
            assert.strictEqual(lastMatch, '/route/test/literal/match');
        });

        it('Should prioritise param matches over wildcard matches', () => {
            const handled = router.route(
                new OscMessage('/route/test/value/match'),
            );

            assert.isTrue(handled);
            assert.strictEqual(lastMatch, '/route/test/{param}/match');
        });

        it('Should return false when a route has no match', () => {
            const handled = router.route(new OscMessage('/unknown/address'));

            assert.isFalse(handled);
            assert.isNull(lastMatch);
        });

        it('Should fall back to the closest matching wildcard route', () => {
            let handled = router.route(new OscMessage('/route/catchall'));

            assert.isTrue(handled);
            assert.strictEqual(lastMatch, '/route/*');

            handled = router.route(new OscMessage('/route/test/catchall'));

            assert.isTrue(handled);
            assert.strictEqual(lastMatch, '/route/test/*');
        });
    });
});
