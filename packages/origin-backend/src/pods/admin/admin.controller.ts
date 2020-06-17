import {
    IUser,
    Role,
    SupportedEvents,
    UserStatusChangedEvent,
    IUserFilter
} from '@energyweb/origin-backend-core';
import { Roles, RolesGuard, ActiveUserGuard } from '@energyweb/origin-backend-utils';
import { Body, Controller, Get, Param, Put, UseGuards, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { NotificationService } from '../notification/notification.service';
import { UserService } from '../user/user.service';

@Controller('admin')
export class AdminController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly userService: UserService
    ) {}

    @Get('users')
    @UseGuards(AuthGuard('jwt'), ActiveUserGuard, RolesGuard)
    @Roles(Role.Admin, Role.SupportAgent)
    public async getUsers(@Query() filter?: IUserFilter) {
        if (Object.keys(filter).length === 0) {
            return this.userService.getAll({ relations: ['organization'] });
        }

        const { status, kycStatus } = filter;

        const cleanFilter = {
            ...filter,
            status: status ? Number(status) : status,
            kycStatus: kycStatus ? Number(kycStatus) : kycStatus
        };

        return this.userService.getUsersBy(cleanFilter);
    }

    @Put('users/:id')
    @UseGuards(AuthGuard('jwt'), ActiveUserGuard, RolesGuard)
    @Roles(Role.Admin, Role.SupportAgent)
    public async put(@Param('id') id: string, @Body() body: IUser) {
        const user = await this.userService.update(id, body);
        const eventData: UserStatusChangedEvent = {
            email: user.email
        };

        this.notificationService.handleEvent({
            type: SupportedEvents.USER_STATUS_CHANGED,
            data: eventData
        });

        return user;
    }
}
