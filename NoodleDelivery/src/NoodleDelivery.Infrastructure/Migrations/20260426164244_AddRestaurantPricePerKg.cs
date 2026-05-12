using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NoodleDelivery.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantPricePerKg : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PricePerKg",
                table: "Restaurants",
                type: "decimal(10,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PricePerKg",
                table: "Restaurants");
        }
    }
}
