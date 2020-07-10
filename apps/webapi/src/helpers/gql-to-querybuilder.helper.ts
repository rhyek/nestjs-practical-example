import { Injectable } from '@nestjs/common';
import { QueryBuilder, QueryOrderMap } from 'mikro-orm';
import { MetadataStorage } from 'mikro-orm/dist/metadata';
import { QBFilterQuery } from 'mikro-orm/dist/typings';

export interface JoinConfig {
  field: string;
  alias: string;
  cond?: QBFilterQuery;
  type?: 'leftJoin' | 'innerJoin' | 'pivotJoin';
  path?: string;
}

@Injectable()
export class GqlToQueryBuilderHelper {
  private transformCondition(operator: string, operand?: any): [string, any] {
    if (operator === '_contains') {
      return ['$like', `%${operand}%`];
    }
    return [operator.replace(/^_/, '$'), operand];
  }

  private walkFields(
    queryBuilder: QueryBuilder,
    entityName: string,
    relationFieldName: string | null,
    whereOrOrderByInput: Record<string, any>,
    joinConfigs: JoinConfig[],
    handleScalar: (fieldNameWithAlias: string, fieldObj: any) => void,
    handleUnknownField?: (
      entityName: string,
      relationFieldName: string | null,
      fieldName: string,
      fieldObj: any,
    ) => boolean,
  ): void {
    const metadata: MetadataStorage = queryBuilder['metadata'];
    for (const [fieldName, fieldObj] of Object.entries(whereOrOrderByInput)) {
      const fieldMetadata = metadata.get(entityName).properties[fieldName];
      if (!fieldMetadata) {
        if (
          !handleUnknownField ||
          handleUnknownField(
            entityName,
            relationFieldName,
            fieldName,
            fieldObj,
          ) === false
        ) {
          throw new Error(
            `${fieldName} field not found in ${entityName} entity`,
          );
        }
      } else {
        if (fieldMetadata.reference === 'scalar') {
          const alias = joinConfigs.find(jc => jc.field === relationFieldName)
            ?.alias;
          handleScalar(`${alias ? `${alias}.` : ''}${fieldName}`, fieldObj);
        } else {
          if (!joinConfigs.some(jc => jc.field === fieldName)) {
            joinConfigs.push({
              field: fieldName,
              alias: queryBuilder.getNextAlias(),
            });
          }
          const { type: nextEntityName } = fieldMetadata;
          this.walkFields(
            queryBuilder,
            nextEntityName,
            fieldName,
            fieldObj,
            joinConfigs,
            handleScalar,
            handleUnknownField,
          );
        }
      }
    }
  }

  private generateWhereObject(
    queryBuilder: QueryBuilder,
    entityName: string,
    whereInput: Record<string, any>,
    joinConfigs: JoinConfig[],
    whereObj: Record<string, any[]> = { $and: [] },
    relationFieldName?: string | null,
  ): Record<string, any[]> {
    const conditionsTarget = Object.values(whereObj)[0];
    this.walkFields(
      queryBuilder,
      entityName,
      relationFieldName ?? null,
      whereInput,
      joinConfigs,
      (fieldNameWithAlias, conditionsInput) => {
        const conditions: Record<string, any> = {};
        for (let [operator, operand] of Object.entries(conditionsInput)) {
          const [finalOperator, finalOperand] = this.transformCondition(
            operator,
            operand,
          );
          conditions[finalOperator] = finalOperand;
        }
        const entry = { [fieldNameWithAlias]: conditions };
        conditionsTarget.push(entry);
      },
      (entityName, relationFieldName, fieldName, fieldObj) => {
        if (['_and', '_or'].includes(fieldName)) {
          const [finalOperator] = this.transformCondition(fieldName);
          const nestedWhereObj = this.generateWhereObject(
            queryBuilder,
            entityName,
            fieldObj,
            joinConfigs,
            { [finalOperator]: [] },
            relationFieldName,
          );
          conditionsTarget.push(nestedWhereObj);
          return true;
        }
        return false;
      },
    );
    return whereObj;
  }

  private generateOrderByObject(
    queryBuilder: QueryBuilder,
    entityName: string,
    orderByInput: Record<string, any>,
    joinConfigs: JoinConfig[],
  ) {
    const orderByObj: Record<string, any> = {};
    this.walkFields(
      queryBuilder,
      entityName,
      null,
      orderByInput,
      joinConfigs,
      (fieldNameWithAlias, order) => {
        orderByObj[fieldNameWithAlias] = order;
      },
    );
    return orderByObj;
  }

  configureQueryBuilder(
    queryBuilder: QueryBuilder,
    whereInput?: any,
    orderByInput?: any,
  ) {
    const entityName: string = queryBuilder['entityName'];
    const joinConfigs: JoinConfig[] = [];
    let whereObj: object | null = null;
    let orderByObj: QueryOrderMap | null = null;
    if (whereInput) {
      whereObj = this.generateWhereObject(
        queryBuilder,
        entityName,
        whereInput,
        joinConfigs,
      );
      queryBuilder.where(whereObj);
    }
    if (orderByInput) {
      orderByObj = this.generateOrderByObject(
        queryBuilder,
        entityName,
        orderByInput,
        joinConfigs,
      );
      queryBuilder.orderBy(orderByObj);
    }
    for (const joinConfig of joinConfigs) {
      const { field, alias, cond, type, path } = joinConfig;
      queryBuilder.join(field, alias, cond, type, path);
    }
  }
}
