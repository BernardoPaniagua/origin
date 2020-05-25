import { ExtendedBaseEntity } from '@energyweb/origin-backend';
import BN from 'bn.js';
import { Transform, Exclude } from 'class-transformer';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { BNTransformer } from '../../utils/valueTransformers';
import { Asset } from '../asset/asset.entity';
import { Bundle } from './bundle.entity';

@Entity()
export class BundleItem extends ExtendedBaseEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Asset, { eager: true })
    asset: Asset;

    @Column('varchar', { transformer: BNTransformer })
    @Transform((v: BN) => v.toString(10))
    startVolume: BN;

    @Column('varchar', { transformer: BNTransformer })
    @Transform((v: BN) => v.toString(10))
    currentVolume: BN;

    @ManyToOne(() => Bundle, (bundle) => bundle.items)
    @Exclude()
    bundle: Bundle;
}
