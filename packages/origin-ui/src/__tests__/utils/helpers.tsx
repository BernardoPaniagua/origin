import { createMemoryHistory } from 'history';
import createSagaMiddleware from 'redux-saga';
import { applyMiddleware, createStore } from 'redux';
import { routerMiddleware, ConnectedRouter } from 'connected-react-router';
import { createRootReducer } from '../../reducers';
import sagas from '../../features/sagas';
import { User } from '@energyweb/user-registry';
import { addUser, updateCurrentUserId, updateFetcher } from '../../features/users/actions';
import { ReactWrapper } from 'enzyme';
import { Configuration, Compliance } from '@energyweb/utils-general';
import { Certificate } from '@energyweb/origin';
import { ProducingAsset } from '@energyweb/asset-registry';
import { producingAssetCreatedOrUpdated } from '../../features/producingAssets/actions';
import { certificateCreatedOrUpdated } from '../../features/certificates/actions';
import { dataTestSelector } from '../../utils/Helper';
import moment from 'moment';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import React from 'react';
import MomentUtils from '@date-io/moment';
import { Provider } from 'react-redux';

export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const flushPromises = () => new Promise(setImmediate);

export async function waitForConditionAndAssert(
    conditionCheckFunction: () => Promise<boolean> | boolean,
    assertFunction: () => Promise<void> | void,
    interval: number,
    timeout: number
): Promise<void> {
    let timePassed = 0;

    while (timePassed < timeout) {
        if (await conditionCheckFunction()) {
            await assertFunction();

            return;
        }

        await wait(interval);
        timePassed += interval;
    }

    await assertFunction();
}

const setupStoreInternal = (initialHistoryEntries?: string[]) => {
    const history = createMemoryHistory({
        initialEntries: initialHistoryEntries
    });

    const sagaMiddleware = createSagaMiddleware();

    const middleware = applyMiddleware(routerMiddleware(history), sagaMiddleware);

    const store = createStore(createRootReducer(history), middleware);

    Object.keys(sagas).forEach((saga: keyof typeof sagas) => {
        sagaMiddleware.run(sagas[saga]);
    });

    return {
        store,
        history
    };
};

interface ICreateProducingAssetProperties {
    id: string;
    owner?: string;
    facilityName?: string;
    assetType?: string;
    address?: string;
    country?: string;
    capacityWh?: number;
    lastSmartMeterReadWh?: number;
    operationalSince?: number;
    complianceRegistry?: Compliance;
}

export const DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES = ({
    facilityName: 'Wuthering Heights facility',
    assetType: 'Solar;Photovoltaic;Roof mounted',
    country: 'Thailand',
    address: '95 Moo 7, Sa Si Mum Sub-district, Kamphaeng Saen District, Nakhon Province 73140',
    capacityWh: 9876543,
    operationalSince: 1568746970,
    complianceRegistry: Compliance.IREC
} as Partial<ProducingAsset.IOffChainProperties>) as ProducingAsset.IOffChainProperties;

export const createProducingAsset = (
    properties: ICreateProducingAssetProperties
): ProducingAsset.Entity => {
    const owner = properties.owner || '0x0';
    const lastSmartMeterReadWh = properties.lastSmartMeterReadWh || 7777;

    const offChainProperties: ProducingAsset.IOffChainProperties = {
        address: properties.address || DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES.address,
        facilityName:
            properties.facilityName || DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES.facilityName,
        assetType: properties.assetType || DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES.assetType,
        capacityWh: properties.capacityWh || DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES.capacityWh,
        operationalSince:
            properties.operationalSince ||
            DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES.operationalSince,
        complianceRegistry:
            properties.complianceRegistry ||
            DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES.complianceRegistry,
        country: properties.country || DEFAULT_PRODUCING_ASSET_OFFCHAIN_PROPERTIES.country,
        gpsLatitude: '',
        gpsLongitude: '',
        otherGreenAttributes: '',
        typeOfPublicSupport: ''
    };

    return {
        id: properties.id,
        configuration: {
            blockchainProperties: {
                activeUser: {
                    address: '0x0'
                }
            } as Configuration.BlockchainProperties
        } as Configuration.Entity,
        owner: {
            address: owner
        },
        offChainProperties,
        lastSmartMeterReadWh
    } as ProducingAsset.Entity;
};

interface ICreateCertificateProperties {
    id: string;
    owner?: string;
    energy?: number;
    creationTime?: number;
    assetId?: number;
    status?: Certificate.Status;
}

export const createCertificate = (properties: ICreateCertificateProperties): Certificate.Entity => {
    const status =
        typeof properties.status === 'undefined' ? Certificate.Status.Active : properties.status;

    return {
        id: properties.id,
        configuration: ({
            blockchainProperties: {
                activeUser: {
                    address: '0x0'
                }
            }
        } as Partial<Configuration.Entity>) as Configuration.Entity,
        status,
        owner: properties.owner,
        energy: properties.energy,
        creationTime: properties.creationTime,
        assetId: properties.assetId
    } as Certificate.Entity;
};

interface ISetupStoreOptions {
    mockUserFetcher: boolean;
}

const DEFAULT_SETUP_STORE_OPTIONS: ISetupStoreOptions = {
    mockUserFetcher: true
};

export const setupStore = (
    initialHistoryEntries?: string[],
    options: ISetupStoreOptions = DEFAULT_SETUP_STORE_OPTIONS
) => {
    const { store, history } = setupStoreInternal(initialHistoryEntries);

    if (options.mockUserFetcher) {
        const mockUserFetcher = {
            async fetch(id: string) {
                return ({
                    id,
                    organization: 'Example Organization'
                } as Partial<User.Entity>) as User.Entity;
            }
        };

        store.dispatch(updateFetcher(mockUserFetcher));
    }

    return {
        store,
        setCurrentUser: (properties: ISetCurrentUserProperties) => {
            const user: Partial<User.Entity> = {
                id: properties.id,
                organization: properties.organization || 'Example Organization',
                isRole: () => true
            };

            store.dispatch(addUser(user as User.Entity));

            store.dispatch(updateCurrentUserId(user.id));
        },
        addProducingAsset: (properties: ICreateProducingAssetProperties) => {
            const entity = createProducingAsset(properties);
            store.dispatch(producingAssetCreatedOrUpdated(entity));
        },
        addCertificate: (properties: ICreateCertificateProperties) => {
            const entity = createCertificate(properties);
            store.dispatch(certificateCreatedOrUpdated(entity));
        },
        history
    };
};

interface ISetCurrentUserProperties {
    id: string;
    organization?: string;
}

export const createRefreshFunction = (rendered: ReactWrapper) => async () => {
    await flushPromises();
    rendered.update();
};

interface IWrapperProps {
    store: ReturnType<typeof setupStoreInternal>['store'];
    history: ReturnType<typeof setupStoreInternal>['history'];
    children: React.ReactNode;
}

export const WrapperComponent = (props: IWrapperProps) => {
    return (
        <MuiPickersUtilsProvider utils={MomentUtils}>
            <Provider store={props.store}>
                <ConnectedRouter history={props.history}>{props.children}</ConnectedRouter>
            </Provider>
        </MuiPickersUtilsProvider>
    );
};

export const createRenderedHelpers = (rendered: ReactWrapper) => {
    const refresh = createRefreshFunction(rendered);

    return {
        assertPagination: (firstIndex: number, lastIndex: number, total: number) => {
            expect(rendered.find('span.MuiTablePagination-caption').text()).toBe(
                `${firstIndex}-${lastIndex} of ${total}`
            );
        },
        assertMainTableContent: (expected: string[]) => {
            expect(rendered.find('table tbody tr td').map(el => el.text())).toEqual(expected);
        },
        refresh,
        fillInputField: (name: string, value: string) => {
            const input = rendered.find(`${dataTestSelector(name)} input`);
            const inputField = input.getDOMNode();

            expect(inputField.getAttribute('name')).toBe(name);

            input.simulate('change', { target: { value, name } });
        },
        fillDate: async (name: string, dayOfMonth: number) => {
            const now = moment();

            rendered.find(`div${dataTestSelector(name)}`).simulate('click');

            expect(document.querySelector('.MuiPickersToolbar-toolbar').textContent).toBe(
                now.format('YYYYddd, MMM D')
            );

            const daysElements = document.querySelectorAll(
                '.MuiPickersDay-day:not(.MuiPickersDay-hidden)'
            );
            (daysElements.item(dayOfMonth - 1) as HTMLElement).click();

            await refresh();

            expect(
                (rendered.find(`${dataTestSelector(name)} input`).getDOMNode() as HTMLInputElement)
                    .value
            ).toBe(
                now
                    .clone()
                    .set('date', dayOfMonth)
                    .format('MMMM Do')
            );

            // Close Datepicker (click outside)
            (document.querySelector('body > [role="presentation"] > div') as HTMLElement).click();

            await refresh();

            await waitForConditionAndAssert(
                () => document.querySelector('.MuiPickersToolbar-toolbar') === null,
                () => {
                    expect(document.querySelector('.MuiPickersToolbar-toolbar')).toBe(null);
                },
                10,
                100
            );
        },
        fillSelect: async (name: string, valueToSelect: string, labels: string[]) => {
            expect(
                (rendered.find(`${dataTestSelector(name)} input`).getDOMNode() as HTMLInputElement)
                    .value
            ).toBe('');

            rendered.find(`#select-${name}`).simulate('click');

            expect(
                Array.from(document.querySelectorAll(`#menu-${name} ul li`)).map(i => i.textContent)
            ).toStrictEqual(labels);

            (document.querySelector(
                `#menu-${name} [data-value="${valueToSelect}"]`
            ) as HTMLElement).click();

            await refresh();

            expect(document.querySelector(`#menu-${name} [data-value="${valueToSelect}"]`)).toBe(
                null
            );

            expect(
                (rendered.find(`${dataTestSelector(name)} input`).getDOMNode() as HTMLInputElement)
                    .value
            ).toBe(valueToSelect);
        }
    };
};