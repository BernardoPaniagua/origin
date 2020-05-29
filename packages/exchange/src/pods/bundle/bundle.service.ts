import {
    BadRequestException,
    ForbiddenException,
    forwardRef,
    Inject,
    Injectable,
    Logger
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import BN from 'bn.js';
import { Repository } from 'typeorm';

import { AccountBalanceService } from '../account-balance/account-balance.service';
import { Asset } from '../asset/asset.entity';
import { BundleItem } from './bundle-item.entity';
import { BundleTrade } from './bundle-trade.entity';
import { Bundle } from './bundle.entity';
import { BuyBundleDTO } from './buy-bundle.dto';
import { CreateBundleDTO } from './create-bundle.dto';

@Injectable()
export class BundleService {
    private readonly logger = new Logger(BundleService.name);

    private energyPerUnit: BN;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Bundle)
        private readonly bundleRepository: Repository<Bundle>,
        @InjectRepository(BundleTrade)
        private readonly bundleTradeRepository: Repository<BundleTrade>,
        @Inject(forwardRef(() => AccountBalanceService))
        private readonly accountBalanceService: AccountBalanceService
    ) {
        this.energyPerUnit = new BN(this.configService.get<string>('ENERGY_PER_UNIT'));
    }

    public async get(id: string): Promise<Bundle> {
        return this.bundleRepository.findOne(id);
    }

    public async getByUser(userId: string): Promise<Bundle[]> {
        return this.bundleRepository.find({ userId });
    }

    public async getTrades(userId: string): Promise<BundleTrade[]> {
        return this.bundleTradeRepository.find({ where: { buyerId: userId } });
    }

    public async getAvailable(): Promise<Bundle[]> {
        return this.bundleRepository.find({ isCancelled: false });
    }

    public async create(userId: string, createBundle: CreateBundleDTO): Promise<Bundle> {
        this.logger.debug(
            `Bundle creation requested by userId=${userId} ${JSON.stringify(createBundle)}`
        );

        if (!(await this.hasEnoughAssets(userId, createBundle))) {
            throw new ForbiddenException('Not enough assets');
        }

        const bundle: Bundle = {
            userId,
            isCancelled: false,
            price: createBundle.price,
            items: createBundle.items.map(
                (item): BundleItem =>
                    ({
                        asset: { id: item.assetId } as Asset,
                        startVolume: new BN(item.volume),
                        currentVolume: new BN(item.volume)
                    } as BundleItem)
            )
        } as Bundle;

        const createdBundle = await this.bundleRepository.save(bundle);
        return new Bundle(createdBundle);
    }

    public async buy(userId: string, buyBundle: BuyBundleDTO) {
        const bundle = await this.get(buyBundle.bundleId);

        this.logger.debug(
            `User ${userId} requested ${JSON.stringify(buyBundle)} from bundle ${JSON.stringify(
                bundle
            )}`
        );

        if (bundle.isCancelled) {
            throw new ForbiddenException('Unable to buy cancelled bundle');
        }

        if (bundle.userId === userId) {
            throw new ForbiddenException('Unable to buy owned bundle');
        }

        const volumeToBuy = new BN(buyBundle.volume);
        if (bundle.available.lt(volumeToBuy)) {
            throw new ForbiddenException('Request volume is greater than available');
        }

        if (!bundle.canSplit(volumeToBuy, this.energyPerUnit)) {
            throw new BadRequestException('Unable to split bundle');
        }

        const trade: BundleTrade = {
            bundle: { id: bundle.id },
            buyerId: userId,
            volume: new BN(buyBundle.volume)
        } as BundleTrade;

        const { id } = await this.bundleTradeRepository.save(trade);

        return this.bundleTradeRepository.findOne(id);
    }

    public async cancel(userId: string, bundleId: string) {
        await this.bundleRepository.update({ userId, id: bundleId }, { isCancelled: true });

        return this.get(bundleId);
    }

    private async hasEnoughAssets(userId: string, createBundle: CreateBundleDTO) {
        const assets = createBundle.items.map((item) => ({
            id: item.assetId,
            amount: new BN(item.volume)
        }));

        return this.accountBalanceService.hasEnoughAssetAmount(userId, ...assets);
    }
}
