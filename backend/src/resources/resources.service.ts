import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { ResourceType } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async listPublic(type?: ResourceType, page = 1, limit = 20) {
    const where = { published: true, ...(type ? { type } : {}) }
    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          type: true,
          title: true,
          description: true,
          createdAt: true,
        },
      }),
      this.prisma.resource.count({ where }),
    ])
    return { items, total, totalPages: Math.ceil(total / limit) }
  }

  async findBySlug(slug: string) {
    const resource = await this.prisma.resource.findUnique({ where: { slug } })
    if (!resource || !resource.published) throw new NotFoundException('Resource not found')
    return resource
  }

  async adminList(page = 1, limit = 20) {
    const [items, total] = await Promise.all([
      this.prisma.resource.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.resource.count(),
    ])
    return { items, total, totalPages: Math.ceil(total / limit) }
  }

  async create(dto: CreateResourceDto) {
    const existing = await this.prisma.resource.findUnique({ where: { slug: dto.slug } })
    if (existing) throw new ConflictException('Slug already taken')
    return this.prisma.resource.create({ data: dto })
  }

  async update(id: string, dto: UpdateResourceDto) {
    await this.findById(id)
    if (dto.slug) {
      const conflict = await this.prisma.resource.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      })
      if (conflict) throw new ConflictException('Slug already taken')
    }
    return this.prisma.resource.update({ where: { id }, data: dto })
  }

  async remove(id: string) {
    await this.findById(id)
    return this.prisma.resource.delete({ where: { id } })
  }

  private async findById(id: string) {
    const resource = await this.prisma.resource.findUnique({ where: { id } })
    if (!resource) throw new NotFoundException('Resource not found')
    return resource
  }
}
