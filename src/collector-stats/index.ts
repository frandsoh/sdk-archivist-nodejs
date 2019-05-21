import { IXyoPlugin, IXyoGraphQlDelegate } from '@xyo-network/sdk-base-nodejs'
import { XyoBoundWitnessInserter, XyoObjectSchema, XyoBoundWitness } from '@xyo-network/sdk-core-nodejs'
import { XyoCollectorStats } from './xyo-collecter-stats'
import { XyoIterableStructure, XyoStructure, XyoSchema } from '@xyo-network/object-model'
import { XyoCollecterStatsResolver } from './xyo-collecter-stats-resolver'

class XyoCollectorStatsPlugin implements IXyoPlugin {
  public BOUND_WITNESS_COLLECTOR_STATS: XyoCollectorStats | undefined

  public getName(): string {
    return 'collector-stats'
  }

  public getProvides(): string[] {
    return [
      'BOUND_WITNESS_COLLECTOR_STATS'
    ]
  }
  public getPluginDependencies(): string[] {
    return [
      'BOUND_WITNESS_INSERTER'
    ]
  }

  public async initialize(deps: { [key: string]: any; }, config: any, graphql?: IXyoGraphQlDelegate | undefined): Promise<boolean> {
    const inserter = deps.BOUND_WITNESS_INSERTER as XyoBoundWitnessInserter
    const stats = new XyoCollectorStats()
    const resolver = new XyoCollecterStatsResolver(stats)

    if (!graphql) {
      throw new Error('XyoCollectorStatsPlugin expecting graphql')
    }

    graphql.addQuery(XyoCollecterStatsResolver.query)
    graphql.addResolver(XyoCollecterStatsResolver.queryName, resolver)
    graphql.addType(XyoCollecterStatsResolver.type)

    inserter.addBlockListener('collector-stats', (boundWitness) => {
      let nestedBlockCount = 0
      const hashSet = this.getNestedObjectType(new XyoBoundWitness(boundWitness), XyoObjectSchema.FETTER, XyoObjectSchema.BRIDGE_HASH_SET)

      if (hashSet) {
        nestedBlockCount = (hashSet as XyoIterableStructure).getCount()
      }

      stats.didBoundWitness(nestedBlockCount)
      stats.commit()
    })

    this.BOUND_WITNESS_COLLECTOR_STATS = stats

    await stats.restore()

    return true
  }

  private getNestedObjectType(boundWitness: XyoBoundWitness, rootSchema: XyoSchema, subSchema: XyoSchema): XyoStructure | undefined {
    const it = boundWitness.newIterator()

    while (it.hasNext()) {
      const bwItem = it.next().value

      if (bwItem.getSchema().id === rootSchema.id && bwItem instanceof XyoIterableStructure) {
        const fetterIt = bwItem.newIterator()

        while (fetterIt.hasNext()) {
          const fetterItem = fetterIt.next().value

          if (fetterItem.getSchema().id === subSchema.id) {
            return fetterItem
          }
        }
      }
    }

    return
  }

}

module.exports = new XyoCollectorStatsPlugin()
