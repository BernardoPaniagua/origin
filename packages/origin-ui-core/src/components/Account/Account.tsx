import React from 'react';
import { useSelector } from 'react-redux';
import { NavLink, Route, Redirect } from 'react-router-dom';

import { PageContent } from '../PageContent/PageContent';
import { getUserOffchain } from '../../features/users/selectors';
import { AccountSettings } from './AccountSettings';
import { UserRegister } from './UserRegister';
import { UserLogin } from './UserLogin';
import { dataTest, useLinks, useTranslation } from '../../utils';
import { UserProfile } from './UserProfile';
import { ConfirmEmail } from './ConfirmEmail';

export function Account() {
    const userOffchain = useSelector(getUserOffchain);

    const { baseURL, getAccountLink } = useLinks();
    const { t } = useTranslation();

    const isLoggedIn = Boolean(userOffchain);

    const Menu = [
        {
            key: 'settings',
            label: 'settings.navigation.settings',
            component: AccountSettings,
            hide: !isLoggedIn
        },
        {
            key: 'user-login',
            label: 'settings.navigation.login',
            component: UserLogin,
            hide: isLoggedIn
        },
        {
            key: 'user-register',
            label: 'settings.navigation.registerUser',
            component: UserRegister,
            hide: isLoggedIn
        },
        {
            key: 'user-profile',
            label: 'settings.navigation.userProfile',
            component: UserProfile,
            hide: !isLoggedIn
        },
        {
            key: 'confirm-email',
            label: 'settings.navigation.confirmEmail',
            component: ConfirmEmail,
            hide: true
        }
    ];

    return (
        <div className="PageWrapper">
            <div className="PageNav">
                <ul className="NavMenu nav">
                    {Menu.map((menu) => {
                        if (menu.hide) {
                            return null;
                        }

                        return (
                            <li key={menu.key}>
                                <NavLink
                                    exact={true}
                                    to={`${getAccountLink()}/${menu.key}`}
                                    activeClassName="active"
                                    {...dataTest(`account-link-${menu.key}`)}
                                >
                                    {t(menu.label)}
                                </NavLink>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <Route
                path={`${getAccountLink()}/:key/:id?`}
                render={(props) => {
                    const key = props.match.params.key;

                    return (
                        <PageContent
                            menu={Menu.find((item) => item.key === key)}
                            redirectPath={getAccountLink()}
                            {...props}
                        />
                    );
                }}
            />

            <Route
                exact={true}
                path={`${getAccountLink()}`}
                render={() => <Redirect to={{ pathname: `${getAccountLink()}/${Menu[0].key}` }} />}
            />
            <Route
                exact={true}
                path={`${baseURL}/`}
                render={() => <Redirect to={{ pathname: `${getAccountLink()}/${Menu[0].key}` }} />}
            />
        </div>
    );
}
