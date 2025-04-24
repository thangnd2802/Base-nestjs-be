import { Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateMongoId } from 'src/common/util';

export interface IBaseEntity {
  _id: string;
}

export class BaseEntity extends Document<string> implements IBaseEntity {
  @Prop({ type: String, default: () => generateMongoId() })
  _id: string;
}
