import React from 'react';
import {
    Paper,
    Typography,
    Grid,
    makeStyles,
    createStyles,
    useTheme,
    Divider,
    InputAdornment,
    Button
} from '@material-ui/core';
import { HierarchicalMultiSelect } from '../HierarchicalMultiSelect';
import { useSelector } from 'react-redux';
import { getConfiguration } from '../../features';
import { Skeleton } from '@material-ui/lab';
import { useValidation, Moment, useTranslation, formatCurrencyComplete } from '../../utils';
import { calculateTotalPrice } from '../../utils/exchange';
import { Formik, Form } from 'formik';
import { FormInput, FormikDatePickerWithMonthArrowsFilled, FormikEffect } from '../Form';
import { DeviceSelectors } from '../DeviceSelectors';

export interface IMarketFormValues {
    generationDateStart: Moment;
    generationDateEnd: Moment;
    price: string;
    energy: string;
    deviceType: string[];
    location: string[];
    gridOperator: string[];
}

const INITIAL_FORM_VALUES: IMarketFormValues = {
    energy: '',
    generationDateStart: null,
    generationDateEnd: null,
    price: '',
    deviceType: [],
    location: [],
    gridOperator: []
};

interface IProps {
    onBid: (values: IMarketFormValues) => void;
    onNotify: (values: IMarketFormValues) => void;
    onChange: (values: IMarketFormValues) => void;
    currency: string;
    energyUnit: string;
    disableBidding?: boolean;
}

export function Market(props: IProps) {
    const { onBid, currency, energyUnit, onNotify, onChange, disableBidding } = props;

    const configuration = useSelector(getConfiguration);

    const { t } = useTranslation();

    const useStyles = makeStyles(() =>
        createStyles({
            wrapper: {
                padding: '10px'
            }
        })
    );

    const classes = useStyles(useTheme());
    const { Yup } = useValidation();

    const VALIDATION_SCHEMA = Yup.object().shape({
        generationDateStart: Yup.date().label(t('exchange.properties.generationDateStart')),
        generationDateEnd: Yup.date().label(t('exchange.properties.generationDateEnd')),
        energy: Yup.number().positive().integer().label(t('exchange.properties.energy')),
        price: Yup.number().positive().min(0.01).label(t('exchange.properties.price'))
    });

    if (!configuration?.deviceTypeService?.deviceTypes) {
        return <Skeleton variant="rect" height={200} />;
    }

    const initialFormValues = INITIAL_FORM_VALUES;

    return (
        <Paper className={classes.wrapper}>
            <Formik
                initialValues={initialFormValues}
                validationSchema={VALIDATION_SCHEMA}
                validateOnMount={false}
                onSubmit={null}
            >
                {(formikProps) => {
                    const { isValid, isSubmitting, setFieldValue, errors, values } = formikProps;

                    const totalPrice = isValid
                        ? calculateTotalPrice(values.price, values.energy)
                        : 0;

                    const fieldDisabled = isSubmitting;

                    const notifyButtonEnabled =
                        values.price && !errors?.price && !isSubmitting && !disableBidding;
                    const bidButtonEnabled =
                        values.price &&
                        values.energy &&
                        !errors?.price &&
                        !errors?.energy &&
                        !isSubmitting &&
                        !disableBidding;

                    return (
                        <Form translate="">
                            <FormikEffect onChange={onChange} />
                            <Typography variant="h4">{t('exchange.info.market')}</Typography>

                            <Grid container spacing={3}>
                                <Grid item xs={6}>
                                    <HierarchicalMultiSelect
                                        selectedValue={values.deviceType}
                                        onChange={(value: string[]) =>
                                            setFieldValue('deviceType', value)
                                        }
                                        allValues={configuration.deviceTypeService.deviceTypes}
                                        selectOptions={[
                                            {
                                                label: t('device.properties.deviceType'),
                                                placeholder: t('device.info.selectDeviceType')
                                            },
                                            {
                                                label: t('device.properties.deviceType'),
                                                placeholder: t('device.info.selectDeviceType')
                                            },
                                            {
                                                label: t('device.properties.deviceType'),
                                                placeholder: t('device.info.selectDeviceType')
                                            }
                                        ]}
                                        disabled={fieldDisabled}
                                    />
                                </Grid>
                                <DeviceSelectors
                                    location={values.location}
                                    onLocationChange={(value) => setFieldValue('location', value)}
                                    gridOperator={values.gridOperator}
                                    onGridOperatorChange={(value) =>
                                        setFieldValue('gridOperator', value)
                                    }
                                    disabled={fieldDisabled}
                                ></DeviceSelectors>
                            </Grid>
                            <br />
                            <Grid container spacing={3}>
                                <Grid item xs={6}>
                                    <FormikDatePickerWithMonthArrowsFilled
                                        name="generationDateStart"
                                        label={t('exchange.properties.generationDateStart')}
                                        disabled={fieldDisabled}
                                        required={false}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <FormikDatePickerWithMonthArrowsFilled
                                        name="generationDateEnd"
                                        label={t('exchange.properties.generationDateEnd')}
                                        disabled={fieldDisabled}
                                        required={false}
                                    />
                                </Grid>
                            </Grid>
                            <br />
                            <Divider variant="middle" />
                            <br />
                            <Grid container spacing={3}>
                                <Grid item xs={6}>
                                    <FormInput
                                        label={t('exchange.properties.energy')}
                                        property="energy"
                                        disabled={fieldDisabled}
                                        className="mt-3"
                                        required
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    {energyUnit}
                                                </InputAdornment>
                                            )
                                        }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <FormInput
                                        label={t('exchange.properties.price')}
                                        property="price"
                                        disabled={fieldDisabled}
                                        className="mt-3"
                                        required
                                        InputProps={{
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    {currency}
                                                </InputAdornment>
                                            )
                                        }}
                                        wrapperProps={{
                                            onBlur: (e) => {
                                                const parsedValue = parseFloat(
                                                    (e.target as any)?.value
                                                );

                                                if (!isNaN(parsedValue) && parsedValue > 0) {
                                                    setFieldValue('price', parsedValue.toFixed(2));
                                                }
                                            }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                            <br />
                            <Grid container spacing={3}>
                                <Grid item xs={6}>
                                    <Typography>
                                        {t('exchange.feedback.total')}:{' '}
                                        {formatCurrencyComplete(totalPrice, currency)}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Button
                                        disabled={!notifyButtonEnabled}
                                        onClick={() => onNotify(values)}
                                    >
                                        {t('exchange.actions.notify')}
                                    </Button>
                                    <Button
                                        disabled={!bidButtonEnabled}
                                        onClick={() => onBid(values)}
                                    >
                                        {t('exchange.actions.bid')}
                                    </Button>
                                </Grid>
                            </Grid>
                        </Form>
                    );
                }}
            </Formik>
        </Paper>
    );
}
