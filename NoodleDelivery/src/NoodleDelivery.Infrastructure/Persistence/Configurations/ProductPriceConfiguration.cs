using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NoodleDelivery.Domain.Entities;

namespace NoodleDelivery.Infrastructure.Persistence.Configurations;

public class ProductPriceConfiguration : IEntityTypeConfiguration<ProductPrice>
{
    public void Configure(EntityTypeBuilder<ProductPrice> builder)
    {
        builder.HasKey(p => p.PriceId);
        builder.Property(p => p.UnitPrice).HasColumnType("decimal(10,2)").IsRequired();
        builder.Property(p => p.EffectiveFrom).IsRequired();
        builder.HasIndex(p => new { p.ProductId, p.EffectiveFrom }).IsUnique();
        builder.HasCheckConstraint("CK_ProductPrice_UnitPrice", "unit_price > 0");
        builder.HasOne(p => p.Product)
            .WithMany(pr => pr.Prices)
            .HasForeignKey(p => p.ProductId);
    }
}
