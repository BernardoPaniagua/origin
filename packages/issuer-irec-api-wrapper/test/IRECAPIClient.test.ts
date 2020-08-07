/* eslint-disable no-unused-expressions */
import dotenv from 'dotenv';
import { expect } from 'chai';
import fs from 'fs';

import { IRECAPIClient } from '../src/IRECAPIClient';
import { Product } from '../src/Product';
import { AccountDetails, Account, AccountType } from '../src/Account';
import { Issue, ApproveIssue } from '../src/Issue';

dotenv.config();

describe('IRECAPIClient tests', () => {
    let client: IRECAPIClient;

    before(async () => {
        client = new IRECAPIClient(process.env.IREC_API_URL);
        await client.login(
            process.env.IREC_API_LOGIN,
            process.env.IREC_API_PASSWORD,
            process.env.IREC_API_CLIENT_ID,
            process.env.IREC_API_CLIENT_SECRET
        );
    });

    it(`should fetch all accounts`, async () => {
        const [firstAccount] = await client.account.getAll();

        expect(firstAccount.details).to.exist;
        expect(firstAccount.type).to.exist;
    });

    it('should fetch account by code', async () => {
        const [firstAccount] = await client.account.getAll();
        const account = await client.account.get(firstAccount.code);

        expect(account.code).to.equal(firstAccount.code);
        expect(account.details).to.exist;
        expect(account.type).to.exist;
    });

    it('should fetch balance by code', async () => {
        const [firstAccount] = await client.account.getAll();
        const [accountBalance] = await client.account.getBalance(firstAccount.code);

        expect(accountBalance.code).to.equal(firstAccount.code);
        expect(accountBalance.product).to.be.instanceOf(Product);
    });

    it('should fetch items by code', async () => {
        const account = 'ACCOUNTTRADE001';
        const [accountItem] = await client.account.getItems('ACCOUNTTRADE001');

        expect(accountItem).to.exist;
        expect(accountItem.items).to.exist;

        expect(accountItem.code).to.be.equal(account);

        const [item] = accountItem.items;

        expect(item.code).to.exist;
        expect(item.asset).to.exist;

        expect(item.asset.start).to.be.an.instanceOf(Date);
        expect(item.asset.end).to.be.an.instanceOf(Date);
    });

    it('should create and delete an account', async () => {
        const details = new AccountDetails();
        details.active = true;
        details.countryCode = 'GB';
        details.name = 'Test';
        details.private = false;
        details.restricted = false;

        const account = new Account();
        account.code = `TEST_ORIGIN_${new Date().getTime()}`;
        account.details = details;
        account.type = AccountType.Redemption;

        await client.account.create(account);

        const { code } = await client.account.get(account.code);

        expect(code).to.equal(account.code);

        await client.account.delete(code);
    });

    it('should be able to request certificate', async () => {
        const request = new Issue();
        request.device = 'DEVICE001';
        request.recipient = 'ACCOUNTTRADE001';
        request.start = new Date(2014, 0, 1);
        request.end = new Date(2014, 0, 2);
        request.production = 100.2;
        request.fuel = 'ES200';

        const code = await client.issue.create(request);
        await client.issue.submit(code, 'Note');
        await client.issue.verify(code, 'Note');

        const approval = new ApproveIssue();
        approval.issuer = 'ACCOUNTISSUE001';
        await client.issue.approve(code, approval);
    });

    it('should be able to upload pdf evidence file', async () => {
        const file = fs.createReadStream(`${__dirname}/file-sample_150kB.pdf`);

        const [fileId] = await client.file.upload([file]);

        expect(fileId).to.exist;

        const url = await client.file.download(fileId);

        expect(url).to.exist;
    });
});
